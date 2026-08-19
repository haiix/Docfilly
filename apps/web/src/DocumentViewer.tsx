import { useCallback } from "react";
import { DocfillyView, type DocfillyRenderState } from "@docfilly/react";
import type { DocfillyDiagnostic, DocfillySourceType } from "docfilly";

export interface ViewerStatus {
  message: string;
  isWarning: boolean;
}

interface DocumentViewerProps {
  source: string;
  sourceType: DocfillySourceType;
  initialValues?: ReadonlyMap<string, string>;
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
  onStatusChange,
  onOutputSourceChange,
  onDiagnosticsChange,
  onValuesChange,
  onDocumentTypeChange,
}: DocumentViewerProps) {
  const handleRender = useCallback(
    (state: DocfillyRenderState): void => {
      onOutputSourceChange(state.outputSource);
      onDiagnosticsChange(state.diagnostics);
      onDocumentTypeChange(state.isDocfilly);

      if (!state.isDocfilly) {
        const formatName = sourceType === "md" ? "Markdown" : "テキスト";
        onStatusChange({
          message: `#!docfilly識別子がないため、通常の${formatName}として表示しています。`,
          isWarning: false,
        });
        onValuesChange(state.values);
        return;
      }

      const warningCount = state.diagnostics.length;
      if (warningCount > 0) {
        onStatusChange({
          message: `${state.values.size}個の設定項目を読み込みました。文書に${warningCount}件の診断があります。`,
          isWarning: false,
        });
        onValuesChange(state.values);
        return;
      }

      onStatusChange({
        message: `${state.values.size}個の設定項目を読み込みました。`,
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
      sourceType,
    ],
  );

  return (
    <DocfillyView
      source={source}
      sourceType={sourceType}
      options={{ initialValues }}
      onRender={handleRender}
    />
  );
}
