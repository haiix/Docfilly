import { useCallback, useReducer } from "react";
import type { DocfillyDiagnostic } from "docfilly";
import type { LoadedDocument } from "./document-file";

export interface DocumentRenderResult {
  outputSource: string;
  values: ReadonlyMap<string, string>;
  isDocfilly: boolean;
  diagnostics: readonly DocfillyDiagnostic[];
}

export interface DocumentWorkspaceState {
  document: LoadedDocument | null;
  initialValues?: ReadonlyMap<string, string>;
  currentValues: ReadonlyMap<string, string> | null;
  outputSource: string | null;
  isDocfilly: boolean;
  diagnostics: readonly DocfillyDiagnostic[];
}

type DocumentWorkspaceAction =
  | {
      type: "open";
      document: LoadedDocument;
      initialValues?: ReadonlyMap<string, string>;
    }
  | { type: "render"; result: DocumentRenderResult }
  | { type: "change-values"; values: ReadonlyMap<string, string> }
  | { type: "prepare-locale-change" }
  | { type: "close" };

export const emptyDocumentWorkspace: DocumentWorkspaceState = {
  document: null,
  currentValues: null,
  outputSource: null,
  isDocfilly: false,
  diagnostics: [],
};

export function documentWorkspaceReducer(
  state: DocumentWorkspaceState,
  action: DocumentWorkspaceAction,
): DocumentWorkspaceState {
  switch (action.type) {
    case "open":
      return {
        ...emptyDocumentWorkspace,
        document: action.document,
        initialValues: action.initialValues,
      };
    case "render":
      return {
        ...state,
        currentValues: new Map(action.result.values),
        outputSource: action.result.outputSource,
        isDocfilly: action.result.isDocfilly,
        diagnostics: action.result.diagnostics,
      };
    case "change-values":
      return { ...state, currentValues: new Map(action.values) };
    case "prepare-locale-change":
      return state.currentValues === null
        ? state
        : { ...state, initialValues: new Map(state.currentValues) };
    case "close":
      return emptyDocumentWorkspace;
  }
}

export function useDocumentWorkspace() {
  const [state, dispatch] = useReducer(documentWorkspaceReducer, emptyDocumentWorkspace);

  const openDocument = useCallback(
    (document: LoadedDocument, initialValues?: ReadonlyMap<string, string>): void => {
      dispatch({ type: "open", document, initialValues });
    },
    [],
  );
  const updateRender = useCallback((result: DocumentRenderResult): void => {
    dispatch({ type: "render", result });
  }, []);
  const updateValues = useCallback((values: ReadonlyMap<string, string>): void => {
    dispatch({ type: "change-values", values });
  }, []);
  const prepareLocaleChange = useCallback((): void => {
    dispatch({ type: "prepare-locale-change" });
  }, []);
  const closeDocument = useCallback((): void => dispatch({ type: "close" }), []);

  return {
    state,
    openDocument,
    updateRender,
    updateValues,
    prepareLocaleChange,
    closeDocument,
  };
}
