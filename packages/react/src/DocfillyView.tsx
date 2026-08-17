import { useEffect, useRef, type HTMLAttributes, type ReactElement } from "react";
import {
  createDocfilly,
  type DocfillyDiagnostic,
  type DocfillyOptions,
  type DocfillySourceType,
} from "docfilly";

export interface DocfillyRenderState {
  outputSource: string;
  values: ReadonlyMap<string, string>;
  diagnostics: readonly DocfillyDiagnostic[];
  isDocfilly: boolean;
}

export interface DocfillyViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  source: string;
  sourceType: DocfillySourceType;
  options?: DocfillyOptions;
  onRender?: (state: DocfillyRenderState) => void;
}

/**
 * Connects a Docfilly instance to React's lifecycle.
 */
export function DocfillyView({
  source,
  sourceType,
  options,
  onRender,
  ...containerProps
}: DocfillyViewProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRenderRef = useRef(onRender);

  useEffect(() => {
    onRenderRef.current = onRender;
  }, [onRender]);

  const debounceMs = options?.debounceMs;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const view = createDocfilly(source, sourceType, { debounceMs });
    const notify = (): void => {
      onRenderRef.current?.({
        outputSource: view.outputSource,
        values: view.values,
        diagnostics: [...view.diagnostics],
        isDocfilly: view.isDocfilly,
      });
    };

    view.element.addEventListener("docfilly:render", notify);
    container.append(view.element);
    notify();

    return () => {
      view.element.removeEventListener("docfilly:render", notify);
      view.destroy();
    };
  }, [source, sourceType, debounceMs]);

  return <div {...containerProps} ref={containerRef} />;
}
