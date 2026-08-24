import type { DocfillyDiagnostic } from "./types";

export type DiagnosticReporter = (diagnostic: DocfillyDiagnostic) => void;
export type ValueTransform = (value: string) => string;

export interface TextNode {
  type: "text";
  value: string;
  line: number;
}

export interface RawNode {
  type: "raw";
  value: string;
}

export interface IfCondition {
  name: string;
  operator?: "=" | "!=";
  expected?: string;
}

export interface IfNode {
  type: "if";
  condition: IfCondition;
  thenNodes: readonly TemplateNode[];
  elseNodes: readonly TemplateNode[];
}

export type TemplateNode = TextNode | RawNode | IfNode;

export interface TemplateToken {
  raw: string;
  trimmed: string;
  line: number;
  start: number;
  end: number;
  directive?: { type: "if"; expression: string } | { type: "else" } | { type: "endif" };
}
