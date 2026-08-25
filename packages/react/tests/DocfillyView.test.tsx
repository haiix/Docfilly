import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Docfilly } from "docfilly";
import { DocfillyView, type DocfillyRenderState } from "../src";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("DocfillyView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("renders the form and reports the initial and updated state", () => {
    vi.useFakeTimers();
    const onRender = vi.fn<(state: DocfillyRenderState) => void>();

    act(() => {
      root.render(
        <DocfillyView
          source={"#!docfilly\nname = Alice\n---\nHello [[name]]"}
          sourceType="text"
          options={{ debounceMs: 10 }}
          onRender={onRender}
          className="host"
          aria-label="preview"
        />,
      );
    });

    const host = container.querySelector<HTMLDivElement>(".host");
    const input = container.querySelector<HTMLInputElement>('input[name="name"]');
    expect(host?.getAttribute("aria-label")).toBe("preview");
    expect(container.querySelector(".docfilly__output")?.textContent).toBe("Hello Alice");
    expect(onRender).toHaveBeenLastCalledWith({
      outputSource: "Hello Alice",
      values: new Map([["name", "Alice"]]),
      diagnostics: [],
      isDocfilly: true,
    });

    act(() => {
      if (input === null) throw new Error("Expected the generated input");
      input.value = "Bob";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      vi.advanceTimersByTime(10);
    });

    expect(onRender).toHaveBeenLastCalledWith({
      outputSource: "Hello Bob",
      values: new Map([["name", "Bob"]]),
      diagnostics: [],
      isDocfilly: true,
    });
  });

  it("reports the latest render diagnostics without duplicating parse diagnostics", () => {
    vi.useFakeTimers();
    const onRender = vi.fn<(state: DocfillyRenderState) => void>();

    act(() => {
      root.render(
        <DocfillyView
          source={"#!docfilly\ninvalid row\nname = Alice\n---\n[[name]] / [[missing]]"}
          sourceType="text"
          options={{ debounceMs: 10 }}
          onRender={onRender}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[name="name"]');
    expect(onRender.mock.lastCall?.[0].diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "missing-equals",
      "undefined-variable",
    ]);

    act(() => {
      if (input === null) throw new Error("Expected the generated input");
      input.value = "Bob";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      vi.advanceTimersByTime(10);
    });

    expect(onRender).toHaveBeenCalledTimes(2);
    expect(onRender.mock.lastCall?.[0]).toMatchObject({
      outputSource: "Bob / [[missing]]",
      diagnostics: [{ code: "missing-equals" }, { code: "undefined-variable" }],
    });
  });

  it("recreates the instance for content props and destroys it on unmount", () => {
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");

    act(() => {
      root.render(<DocfillyView source="first" sourceType="text" />);
    });
    const firstElement = container.querySelector(".docfilly");

    act(() => {
      root.render(<DocfillyView source="second" sourceType="text" />);
    });

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".docfilly")).not.toBe(firstElement);
    expect(container.querySelector(".docfilly__output")?.textContent?.trim()).toBe("second");

    act(() => {
      root.render(<DocfillyView source="second" sourceType="md" />);
    });

    expect(destroy).toHaveBeenCalledTimes(2);
    expect(container.querySelector(".docfilly__output--md")).not.toBeNull();

    act(() => root.unmount());
    expect(destroy).toHaveBeenCalledTimes(3);
  });

  it("passes locale to Core and recreates the instance when it changes", () => {
    const onRender = vi.fn<(state: DocfillyRenderState) => void>();
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");
    const source = "#!docfilly\ninvalid row\n---\nBody";

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ locale: "ja-JP" }}
          onRender={onRender}
        />,
      );
    });
    expect(onRender.mock.lastCall?.[0].diagnostics[0]?.message).toContain("2行目");

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ locale: "en-US" }}
          onRender={onRender}
        />,
      );
    });
    expect(destroy).toHaveBeenCalledOnce();
    expect(onRender.mock.lastCall?.[0].diagnostics[0]?.message).toContain("Line 2");
  });

  it("does not reset form input when only onRender changes", () => {
    vi.useFakeTimers();
    const firstCallback = vi.fn<(state: DocfillyRenderState) => void>();
    const secondCallback = vi.fn<(state: DocfillyRenderState) => void>();
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");
    const source = "#!docfilly\nname = Alice\n---\nHello [[name]]";

    act(() => {
      root.render(<DocfillyView source={source} sourceType="text" onRender={firstCallback} />);
    });
    const input = container.querySelector<HTMLInputElement>('input[name="name"]');
    if (input === null) throw new Error("Expected the generated input");
    input.value = "Bob";

    act(() => {
      root.render(<DocfillyView source={source} sourceType="text" onRender={secondCallback} />);
    });

    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      vi.advanceTimersByTime(200);
    });

    expect(container.querySelector<HTMLInputElement>('input[name="name"]')).toBe(input);
    expect(input.value).toBe("Bob");
    expect(destroy).not.toHaveBeenCalled();
    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenLastCalledWith({
      outputSource: "Hello Bob",
      values: new Map([["name", "Bob"]]),
      diagnostics: [],
      isDocfilly: true,
    });
  });

  it("applies initial values without resetting for an equivalent Map", () => {
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");
    const onRender = vi.fn<(state: DocfillyRenderState) => void>();
    const source = "#!docfilly\nname = Header\n---\nHello [[name]]";

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ initialValues: new Map([["name", "Saved"]]) }}
          onRender={onRender}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[name="name"]');
    if (input === null) throw new Error("Expected the generated input");
    expect(input.value).toBe("Saved");
    expect(onRender).toHaveBeenLastCalledWith({
      outputSource: "Hello Saved",
      values: new Map([["name", "Saved"]]),
      diagnostics: [],
      isDocfilly: true,
    });
    input.value = "Edited";

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ initialValues: new Map([["name", "Saved"]]) }}
        />,
      );
    });

    expect(container.querySelector<HTMLInputElement>('input[name="name"]')).toBe(input);
    expect(input.value).toBe("Edited");
    expect(destroy).not.toHaveBeenCalled();
  });

  it("recreates the instance when initial value contents change", () => {
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");
    const source = "#!docfilly\nname = Header\n---\nHello [[name]]";

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ initialValues: new Map([["name", "First"]]) }}
        />,
      );
    });
    const firstInput = container.querySelector<HTMLInputElement>('input[name="name"]');

    act(() => {
      root.render(
        <DocfillyView
          source={source}
          sourceType="text"
          options={{ initialValues: new Map([["name", "Second"]]) }}
        />,
      );
    });

    const secondInput = container.querySelector<HTMLInputElement>('input[name="name"]');
    expect(secondInput).not.toBe(firstInput);
    expect(secondInput?.value).toBe("Second");
    expect(container.querySelector(".docfilly__output")?.textContent).toBe("Hello Second");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("does not duplicate the Docfilly DOM in Strict Mode", () => {
    const destroy = vi.spyOn(Docfilly.prototype, "destroy");

    act(() => {
      root.render(
        <StrictMode>
          <DocfillyView source="Hello" sourceType="text" />
        </StrictMode>,
      );
    });

    expect(container.querySelectorAll(".docfilly")).toHaveLength(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
