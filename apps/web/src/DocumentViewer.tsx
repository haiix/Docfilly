import { useCallback, useRef, type FormEvent } from "react";
import { DocfillyView, type DocfillyRenderState } from "@docfilly/react";
import type { DocfillySourceType } from "docfilly";
import type { WebLocale, WebMessages } from "./locale";
import type { DocumentRenderResult } from "./use-document-workspace";

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
  onRenderStateChange: (result: DocumentRenderResult) => void;
  onValuesChange: (values: ReadonlyMap<string, string>) => void;
}

export function DocumentViewer({
  source,
  sourceType,
  initialValues,
  locale,
  messages,
  onStatusChange,
  onRenderStateChange,
  onValuesChange,
}: DocumentViewerProps) {
  const latestValuesRef = useRef<ReadonlyMap<string, string>>(initialValues ?? new Map());

  const handleRender = useCallback(
    (state: DocfillyRenderState): void => {
      latestValuesRef.current = state.values;
      onRenderStateChange(state);

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
    [onRenderStateChange, onStatusChange, onValuesChange, messages, sourceType],
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
