import { useCallback } from "react";
import { DocfillyView, type DocfillyRenderState } from "@docfilly/react";
import type { DocfillySourceType } from "docfilly";

export interface ViewerStatus {
  message: string;
  isWarning: boolean;
  title?: string;
}

interface DocumentViewerProps {
  source: string;
  sourceType: DocfillySourceType;
  onStatusChange: (status: ViewerStatus) => void;
}

export function DocumentViewer({ source, sourceType, onStatusChange }: DocumentViewerProps) {
  const handleRender = useCallback(
    (state: DocfillyRenderState): void => {
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
          message: `${state.values.size}個の設定項目を読み込みました。${warningCount}件の注意点があります：${state.diagnostics[0].message}`,
          isWarning: true,
          title: state.diagnostics.map((item) => item.message).join("\n"),
        });
        return;
      }

      onStatusChange({
        message: `${state.values.size}個の設定項目を読み込みました。`,
        isWarning: false,
      });
    },
    [onStatusChange, sourceType],
  );

  return <DocfillyView source={source} sourceType={sourceType} onRender={handleRender} />;
}
