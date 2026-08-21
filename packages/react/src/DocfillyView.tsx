import { useEffect, useRef, type HTMLAttributes, type ReactElement } from "react";
import {
  createDocfilly,
  type DocfillyDiagnostic,
  type DocfillyInitialValues,
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

function initialValuesEqual(
  left: DocfillyInitialValues | undefined,
  right: DocfillyInitialValues | undefined,
): boolean {
  if (left === right) return true;
  if (left === undefined) return false;
  if (right === undefined) return false;
  if (left.size !== right.size) return false;

  for (const [name, value] of left) {
    if (right.get(name) !== value) return false;
  }
  return true;
}

function useStableInitialValues(
  initialValues: DocfillyInitialValues | undefined,
): DocfillyInitialValues | undefined {
  const stableInitialValuesRef = useRef(initialValues);
  if (!initialValuesEqual(stableInitialValuesRef.current, initialValues)) {
    stableInitialValuesRef.current = initialValues;
  }
  return stableInitialValuesRef.current;
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
  const locale = options?.locale;
  const initialValues = useStableInitialValues(options?.initialValues);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const view = createDocfilly(source, sourceType, { debounceMs, initialValues, locale });
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
  }, [source, sourceType, debounceMs, initialValues, locale]);

  return <div {...containerProps} ref={containerRef} />;
}
