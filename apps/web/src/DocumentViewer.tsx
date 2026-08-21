import { useCallback, useRef, type FormEvent } from "react";
import { DocfillyView, type DocfillyRenderState } from "@docfilly/react";
import type { DocfillyDiagnostic, DocfillySourceType } from "docfilly";
import type { WebLocale, WebMessages } from "./locale";

export interface ViewerStatus {
  message: string;
  isWarning: boolean;
}

interface DocumentViewerProps {
  source: string;
  sourceType: DocfillySourceType;
  initialValues?: ReadonlyMap<string, string>;
  locale: WebLocale;
  messages: WebMessages;
  onStatusChange: (status: ViewerStatus) => void;
  onOutputSourceChange: (outputSource: string) => void;
  onDiagnosticsChange: (diagnostics: readonly DocfillyDiagnostic[]) => void;
  onValuesChange: (values: ReadonlyMap<string, string>) => void;
  onDocumentTypeChange: (isDocfilly: boolean) => void;
}

export function DocumentViewer({
  source,
  sourceType,
  initialValues,
  locale,
  messages,
  onStatusChange,
  onOutputSourceChange,
  onDiagnosticsChange,
  onValuesChange,
  onDocumentTypeChange,
}: DocumentViewerProps) {
  const latestValuesRef = useRef<ReadonlyMap<string, string>>(initialValues ?? new Map());

  const handleRender = useCallback(
    (state: DocfillyRenderState): void => {
      latestValuesRef.current = state.values;
      onOutputSourceChange(state.outputSource);
      onDiagnosticsChange(state.diagnostics);
      onDocumentTypeChange(state.isDocfilly);

      if (!state.isDocfilly) {
        const formatName = sourceType === "md" ? "Markdown" : messages.textFormat;
        onStatusChange({
          message: messages.ordinaryDocument(formatName),
          isWarning: false,
        });
        onValuesChange(state.values);
        return;
      }

      const warningCount = state.diagnostics.length;
      if (warningCount > 0) {
        onStatusChange({
          message: messages.loadedWithDiagnostics(state.values.size, warningCount),
          isWarning: false,
        });
        onValuesChange(state.values);
        return;
      }

      onStatusChange({
        message: messages.loaded(state.values.size),
        isWarning: false,
      });
      onValuesChange(state.values);
    },
    [
      onDiagnosticsChange,
      onDocumentTypeChange,
      onOutputSourceChange,
      onStatusChange,
      onValuesChange,
      messages,
      sourceType,
    ],
  );

  const handleInput = useCallback(
    (event: FormEvent<HTMLDivElement>): void => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
      if (control.name === "") return;
      const values = new Map(latestValuesRef.current);
      values.set(
        control.name,
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? String(control.checked)
          : control.value,
      );
      latestValuesRef.current = values;
      onValuesChange(values);
    },
    [onValuesChange],
  );

  return (
    <DocfillyView
      source={source}
      sourceType={sourceType}
      options={{ initialValues, locale }}
      onRender={handleRender}
      onInput={handleInput}
    />
  );
}
