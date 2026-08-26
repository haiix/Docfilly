import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

interface AppDialogProps {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  inactive?: boolean;
  busy?: boolean;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function AppDialog({
  title,
  closeLabel,
  children,
  onClose,
  initialFocusRef,
  inactive = false,
  busy = false,
}: AppDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    (initialFocusRef?.current ?? titleRef.current)?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [initialFocusRef]);

  useEffect(() => {
    if (busy) titleRef.current?.focus();
  }, [busy]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
      return;
    }

    if (event.key !== "Tab" || dialogRef.current === null) return;

    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
    if (focusable.length === 0) {
      event.preventDefault();
      titleRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === titleRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === titleRef.current) {
      event.preventDefault();
      first.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="dialog-backdrop"
      aria-hidden={inactive || undefined}
      inert={inactive || undefined}
      onMouseDown={(event) =>
        !inactive && !busy && event.target === event.currentTarget && onClose()
      }
    >
      <div
        ref={dialogRef}
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <header className="app-dialog__header">
          <h2 ref={titleRef} id={titleId} tabIndex={-1}>
            {title}
          </h2>
          <button
            type="button"
            className="dialog-close"
            aria-label={closeLabel}
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="app-dialog__content">{children}</div>
      </div>
    </div>
  );
}
