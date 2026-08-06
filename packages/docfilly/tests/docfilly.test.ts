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
