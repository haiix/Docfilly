import { useCallback, useEffect, useRef, useState } from "react";
import { isPwaRegistrationSuppressed, trackPwaRegistration } from "./app-data-reset";
import type { WebMessages } from "./locale";

interface PwaUpdateNoticeProps {
  messages: WebMessages;
  onDefer: () => void;
  onUpdate: () => void;
}

export function PwaUpdateNotice({ messages, onDefer, onUpdate }: PwaUpdateNoticeProps) {
  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <p>{messages.updateAvailable}</p>
      <div className="pwa-update__actions">
        <button type="button" className="toolbar-button dialog-cancel-action" onClick={onDefer}>
          {messages.updateLater}
        </button>
        <button type="button" className="toolbar-button pwa-update__reload" onClick={onUpdate}>
          {messages.reloadForUpdate}
        </button>
      </div>
    </aside>
  );
}

interface PwaUpdatePromptProps {
  messages: WebMessages;
}

export function PwaUpdatePrompt({ messages }: PwaUpdatePromptProps) {
  const [needRefresh, setNeedRefresh] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadOnControllerChangeRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || isPwaRegistrationSuppressed()) return;

    let disposed = false;
    let updateInterval: ReturnType<typeof setInterval> | undefined;

    const showWaitingUpdate = (registration: ServiceWorkerRegistration): void => {
      if (registration.waiting !== null && navigator.serviceWorker.controller !== null) {
        setNeedRefresh(true);
      }
    };
    const handleControllerChange = (): void => {
      if (reloadOnControllerChangeRef.current) globalThis.location.reload();
    };
    const handleUpdateFound = (): void => {
      const installing = registrationRef.current?.installing;
      if (installing === null || installing === undefined) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller !== null) {
          setNeedRefresh(true);
        }
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void trackPwaRegistration(navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`))
      .then((registration) => {
        if (disposed || registration === null) return;
        registrationRef.current = registration;
        showWaitingUpdate(registration);
        registration.addEventListener("updatefound", handleUpdateFound);
        updateInterval = setInterval(
          () => {
            if (navigator.onLine) void registration.update();
          },
          60 * 60 * 1000,
        );
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (updateInterval !== undefined) clearInterval(updateInterval);
      registrationRef.current?.removeEventListener("updatefound", handleUpdateFound);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      registrationRef.current = null;
    };
  }, []);

  const applyUpdate = useCallback((): void => {
    const waitingWorker = registrationRef.current?.waiting;
    if (waitingWorker === null || waitingWorker === undefined) return;
    reloadOnControllerChangeRef.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  if (!needRefresh) return null;

  return (
    <PwaUpdateNotice
      messages={messages}
      onDefer={() => setNeedRefresh(false)}
      onUpdate={applyUpdate}
    />
  );
}
