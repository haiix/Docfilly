export type DocfillySourceType = "md" | "text";

export type DocfillyVariable =
  | {
      type: "text";
      name: string;
      label: string;
      initialValue: string;
    }
  | {
      type: "select";
      name: string;
      label: string;
      options: readonly string[];
      initialValue: string;
    }
  | {
      type: "checkbox";
      name: string;
      label: string;
      initialValue: boolean;
    };

export interface DocfillyOptions {
  debounceMs?: number;
}

export type DocfillyDiagnosticCode =
  | "missing-delimiter"
  | "missing-equals"
  | "invalid-variable-name"
  | "duplicate-variable"
  | "invalid-dropdown"
  | "invalid-quoting"
  | "undefined-variable"
  | "unknown-filter"
  | "invalid-placeholder"
  | "invalid-if-condition"
  | "undefined-condition-variable"
  | "invalid-condition-type"
  | "unexpected-directive"
  | "duplicate-else"
  | "unclosed-if"
  | "if-nesting-too-deep"
  | "markdown-render-fallback";

export interface DocfillyDiagnostic {
  code: DocfillyDiagnosticCode;
  severity: "warning";
  message: string;
  line?: number;
  source?: string;
}

export interface ParsedDocfillySource {
  isDocfilly: boolean;
  variables: readonly DocfillyVariable[];
  template: string;
  templateLineOffset: number;
  diagnostics: readonly DocfillyDiagnostic[];
}
