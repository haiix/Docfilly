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
  onStatusChange: (status: ViewerStatus) => void;
  onOutputSourceChange: (outputSource: string) => void;
  onDiagnosticsChange: (diagnostics: readonly DocfillyDiagnostic[]) => void;
}

export function DocumentViewer({
  source,
  sourceType,
  onStatusChange,
  onOutputSourceChange,
  onDiagnosticsChange,
}: DocumentViewerProps) {
  const handleRender = useCallback(
    (state: DocfillyRenderState): void => {
      onOutputSourceChange(state.outputSource);
      onDiagnosticsChange(state.diagnostics);

      if (!state.isDocfilly) {
        const formatName = sourceType === "md" ? "Markdown" : "テキスト";
        onStatusChange({
          message: `#!docfilly識別子がないため、通常の${formatName}として表示しています。`,
          isWarning: false,
        });
        return;
      }

      const warningCount = state.diagnostics.length;
      if (warningCount > 0) {
        onStatusChange({
          message: `${state.values.size}個の設定項目を読み込みました。文書に${warningCount}件の診断があります。`,
          isWarning: false,
        });
        return;
      }

      onStatusChange({
        message: `${state.values.size}個の設定項目を読み込みました。`,
        isWarning: false,
      });
    },
    [onDiagnosticsChange, onOutputSourceChange, onStatusChange, sourceType],
  );

  return <DocfillyView source={source} sourceType={sourceType} onRender={handleRender} />;
}
