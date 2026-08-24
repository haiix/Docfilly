import { describe, expect, it } from "vitest";
import { documentWorkspaceReducer, emptyDocumentWorkspace } from "../src/use-document-workspace";

const document = {
  name: "guide.md",
  source: "#!docfilly\nname = Initial\n---\n# [[name]]",
  sourceType: "md" as const,
};

describe("document workspace", () => {
  it("updates rendering state together and resets it when another document opens", () => {
    const opened = documentWorkspaceReducer(emptyDocumentWorkspace, {
      type: "open",
      document,
      initialValues: new Map([["name", "Restored"]]),
    });
    const rendered = documentWorkspaceReducer(opened, {
      type: "render",
      result: {
        outputSource: "# Restored",
        values: new Map([["name", "Restored"]]),
        isDocfilly: true,
        diagnostics: [{ code: "missing-equals", severity: "warning", message: "warning" }],
      },
    });

    expect(rendered).toMatchObject({
      document,
      outputSource: "# Restored",
      isDocfilly: true,
    });
    expect(rendered.currentValues?.get("name")).toBe("Restored");
    expect(rendered.diagnostics).toHaveLength(1);

    const replacement = { name: "notes.txt", source: "Notes", sourceType: "text" as const };
    expect(documentWorkspaceReducer(rendered, { type: "open", document: replacement })).toEqual({
      ...emptyDocumentWorkspace,
      document: replacement,
      initialValues: undefined,
    });
  });

  it("preserves current values across locale changes and clears every document field on close", () => {
    const opened = documentWorkspaceReducer(emptyDocumentWorkspace, {
      type: "open",
      document,
    });
    const changed = documentWorkspaceReducer(opened, {
      type: "change-values",
      values: new Map([["name", "Current"]]),
    });
    const prepared = documentWorkspaceReducer(changed, { type: "prepare-locale-change" });

    expect(prepared.initialValues?.get("name")).toBe("Current");
    expect(documentWorkspaceReducer(prepared, { type: "close" })).toEqual(emptyDocumentWorkspace);
  });
});
