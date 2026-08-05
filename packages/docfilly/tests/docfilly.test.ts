import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocfilly } from "../src";

describe("Docfilly", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("creates a form and renders markdown with initial values", () => {
    const view = createDocfilly([
      "#!docfilly",
      "title | タイトル = Docfilly",
      "environment = [dev, *prod]",
      "enabled = [x]",
      "---",
      "# [[title]]",
      "Environment: **[[environment]]** / Enabled: [[enabled]]",
    ].join("\n"), "md");

    document.body.append(view.element);

    expect(view.isDocfilly).toBe(true);
    expect(view.form.elements.namedItem("title")).toBeInstanceOf(HTMLInputElement);
    expect(view.form.elements.namedItem("environment")).toBeInstanceOf(HTMLSelectElement);
    expect(view.outputSource).toContain("# Docfilly");
    expect(view.output.innerHTML).toContain("<h1>Docfilly</h1>");
    expect(view.output.innerHTML).toContain("<strong>prod</strong>");
    expect(view.values).toEqual(new Map([
      ["title", "Docfilly"],
      ["environment", "prod"],
      ["enabled", "true"],
    ]));
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
    const view = createDocfilly([
      "#!docfilly",
      "value = <img src=x onerror=alert(1)>",
      "---",
      "[[value]]",
      "<script>alert(1)</script>",
    ].join("\n"), "md");

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
