import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocfilly } from "../src";

describe("Docfilly", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("creates a form and renders markdown with initial values", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "title | タイトル = Docfilly",
        "environment = [dev, *prod]",
        "enabled = [x]",
        "---",
        "# [[title]]",
        "Environment: **[[environment]]** / Enabled: [[enabled]]",
      ].join("\n"),
      "md",
    );

    document.body.append(view.element);

    expect(view.isDocfilly).toBe(true);
    expect(view.form.elements.namedItem("title")).toBeInstanceOf(HTMLInputElement);
    expect(view.form.elements.namedItem("environment")).toBeInstanceOf(HTMLSelectElement);
    expect(view.outputSource).toContain("# Docfilly");
    expect(view.output.innerHTML).toContain("<h1>Docfilly</h1>");
    expect(view.output.innerHTML).toContain("<strong>prod</strong>");
    expect(view.values).toEqual(
      new Map([
        ["title", "Docfilly"],
        ["environment", "prod"],
        ["enabled", "true"],
      ]),
    );
  });

  it("applies serialized initial values to every supported control", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "title = Header title",
        "environment = [*dev, prod]",
        "enabled = [ ]",
        "---",
        "[[title]] / [[environment]] / [[enabled]]",
      ].join("\n"),
      "text",
      {
        initialValues: new Map([
          ["title", "Saved title"],
          ["environment", "prod"],
          ["enabled", "true"],
        ]),
      },
    );

    expect(view.values).toEqual(
      new Map([
        ["title", "Saved title"],
        ["environment", "prod"],
        ["enabled", "true"],
      ]),
    );
    expect(view.outputSource).toBe("Saved title / prod / true");
    expect(view.output.textContent).toBe("Saved title / prod / true");
  });

  it("renders descriptions and controls in source order", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "  >  最初の説明  ",
        "name = Alice",
        ">\t次の説明",
        "enabled = [x]",
        "---",
        "Hello [[name]]",
      ].join("\n"),
      "text",
    );

    expect(
      Array.from(view.form.children).map((element) => ({
        className: element.className,
        text: element.textContent,
      })),
    ).toEqual([
      { className: "docfilly__description", text: " 最初の説明" },
      { className: "docfilly__field docfilly__field--text", text: "name" },
      { className: "docfilly__description", text: "次の説明" },
      { className: "docfilly__field docfilly__field--checkbox", text: "enabled" },
    ]);
  });

  it("renders each description as safe plain text without adding form values", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "> <img src=x onerror=alert(1)>",
        "> [[name | upper]]",
        "name = Alice",
        "---",
        "Hello [[name]]",
      ].join("\n"),
      "md",
    );

    const descriptions = view.form.querySelectorAll(".docfilly__description");
    expect(descriptions).toHaveLength(2);
    expect(descriptions[0]?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(descriptions[0]?.querySelector("img")).toBeNull();
    expect(descriptions[1]?.textContent).toBe("[[name | upper]]");
    expect(view.variables).toHaveLength(1);
    expect(view.values).toEqual(new Map([["name", "Alice"]]));
  });

  it("keeps the form visible when it only contains descriptions", () => {
    const view = createDocfilly("#!docfilly\n> 説明だけのフォーム\n---\nBody", "text");

    expect(view.variables).toEqual([]);
    expect(view.values).toEqual(new Map());
    expect(view.form.hidden).toBe(false);
    expect(view.element.classList.contains("docfilly--without-form")).toBe(false);
    expect(view.form.querySelector(".docfilly__description")?.textContent).toBe(
      "説明だけのフォーム",
    );
  });

  it("ignores unknown, incorrectly typed, and invalid serialized initial values", () => {
    const invalidInitialValues = new Map<string, unknown>([
      ["title", false],
      ["environment", "staging"],
      ["enabled", "yes"],
      ["unknown", "ignored"],
    ]) as ReadonlyMap<string, string>;
    const view = createDocfilly(
      [
        "#!docfilly",
        "title = Header title",
        "environment = [dev, *prod]",
        "enabled = [x]",
        "---",
        "[[title]] / [[environment]] / [[enabled]]",
      ].join("\n"),
      "text",
      { initialValues: invalidInitialValues },
    );

    expect(view.values).toEqual(
      new Map([
        ["title", "Header title"],
        ["environment", "prod"],
        ["enabled", "true"],
      ]),
    );
    expect(view.outputSource).toBe("Header title / prod / true");
  });

  it("updates output after a form input changes", () => {
    vi.useFakeTimers();
    const view = createDocfilly("#!docfilly\nname = before\n---\nHello [[name]]", "text");
    const input = view.form.elements.namedItem("name");

    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) throw new Error("Expected a text input");
    input.value = "after";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(200);

    expect(view.outputSource).toBe("Hello after");
    expect(view.output.textContent).toBe("Hello after");
  });

  it("leaves undefined placeholders unchanged", () => {
    const view = createDocfilly("#!docfilly\nname = Alice\n---\n[[name]] / [[missing]]", "text");

    expect(view.outputSource).toBe("Alice / [[missing]]");
    expect(view.diagnostics).toMatchObject([{ code: "undefined-variable", line: 4 }]);
  });

  it("applies all case filters and composes them from left to right", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "name = Project APIClient-name",
        "---",
        "[[name | upper]]",
        "[[name|lower]]",
        "[[name | snake]]",
        "[[name | kebab]]",
        "[[name | pascal]]",
        "[[name | camel]]",
        "[[name | snake | upper]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe(
      [
        "PROJECT APICLIENT-NAME",
        "project apiclient-name",
        "project_api_client_name",
        "project-api-client-name",
        "ProjectApiClientName",
        "projectApiClientName",
        "PROJECT_API_CLIENT_NAME",
      ].join("\n"),
    );
    expect(view.diagnostics).toEqual([]);
  });

  it("supports case filters in markdown without bypassing HTML escaping", () => {
    const view = createDocfilly(
      "#!docfilly\nvalue = <script>alertTest</script>\n---\n[[value | upper]]",
      "md",
    );

    expect(view.outputSource).toBe("<SCRIPT>ALERTTEST</SCRIPT>");
    expect(view.output.querySelector("script")).toBeNull();
    expect(view.output.textContent?.trim()).toBe("<SCRIPT>ALERTTEST</SCRIPT>");
  });

  it("preserves placeholders and reports unknown filters and invalid syntax", () => {
    const view = createDocfilly(
      "#!docfilly\nname = Alice\n---\n[[name | reverse]]\n[[name | ]]\n[[bad-name | upper]]",
      "text",
    );

    expect(view.outputSource).toBe("[[name | reverse]]\n[[name | ]]\n[[bad-name | upper]]");
    expect(view.diagnostics.map((item) => item.code)).toEqual([
      "unknown-filter",
      "invalid-placeholder",
      "invalid-placeholder",
    ]);
    expect(view.diagnostics.map((item) => item.line)).toEqual([4, 5, 6]);
  });

  it("replaces template diagnostics instead of accumulating them on rerender", () => {
    const view = createDocfilly("#!docfilly\nname = Alice\n---\n[[missing | upper]]", "text");

    expect(view.diagnostics).toHaveLength(1);
    view.render();
    expect(view.diagnostics).toHaveLength(1);
  });

  it("shows an ordinary document without a form when definitions are absent", () => {
    const view = createDocfilly("# 通常の文書", "md");

    expect(view.output.innerHTML).toContain("<h1>通常の文書</h1>");
    expect(view.isDocfilly).toBe(false);
    expect(view.form.hidden).toBe(true);
    expect(view.element.classList.contains("docfilly--without-form")).toBe(true);
    expect(view.diagnostics).toEqual([]);
  });

  it("escapes variable HTML and sanitizes markdown HTML", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "value = <img src=x onerror=alert(1)>",
        "---",
        "[[value]]",
        "<script>alert(1)</script>",
      ].join("\n"),
      "md",
    );

    expect(view.output.querySelector("img")).toBeNull();
    expect(view.output.innerHTML).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(view.output.innerHTML).not.toContain("<script");
    expect(view.output.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("keeps quoted initial values inside the existing markdown safety boundary", () => {
    const view = createDocfilly(
      '#!docfilly\nvalue = "<img src=x onerror=""alert(1)"">"\n---\n[[value]]',
      "md",
    );

    expect(view.values.get("value")).toBe('<img src=x onerror="alert(1)">');
    expect(view.output.querySelector("img")).toBeNull();
    expect(view.output.textContent?.trim()).toBe('<img src=x onerror="alert(1)">');
  });

  it("emits a render event and removes its element when destroyed", () => {
    const view = createDocfilly("#!docfilly\nname = Alice\n---\n[[name]]", "text");
    const listener = vi.fn();
    view.element.addEventListener("docfilly:render", listener);
    document.body.append(view.element);

    view.render();
    expect(listener).toHaveBeenCalledOnce();

    view.destroy();
    expect(document.body.contains(view.element)).toBe(false);
  });
});
