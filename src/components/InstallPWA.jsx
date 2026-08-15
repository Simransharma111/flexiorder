import { useEffect, useRef, useState } from "react";

export default function InstallPWA() {
  const deferredPrompt = useRef(null);

  const [show, setShow] = useState(false);

  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(
    window.navigator.userAgent
  ));

  const [isInstalled] = useState(() => (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(window.navigator.standalone)
  ));

  const [dismissed, setDismissed] = useState(() => (
    localStorage.getItem("pwa-install-dismissed") === "true"
  ));

  useEffect(() => {
    if (isInstalled || dismissed) return;

    const handler = (e) => {
      e.preventDefault();

      deferredPrompt.current = e;

      setShow(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, [dismissed, isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;

    deferredPrompt.current.prompt();

    const choice =
      await deferredPrompt.current.userChoice;

    if (choice.outcome === "accepted") {
      console.log("PWA installed");
    }

    deferredPrompt.current = null;

    setShow(false);
  };

  const handleClose = () => {
    localStorage.setItem(
      "pwa-install-dismissed",
      "true"
    );

    setDismissed(true);
    setShow(false);
  };

  if (isInstalled || dismissed) return null;

  // iPhone fallback
  if (isIOS && !show) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[9999]">
        <div className="bg-[#111827] border border-white/10 text-white rounded-3xl p-4 shadow-2xl backdrop-blur-lg">
          <h3 className="font-extrabold text-base">
            Install App
          </h3>

          <p className="text-sm text-gray-400 mt-2">
            Tap Safari Share button and
            select{" "}
            <span className="text-orange-400 font-semibold">
              Add to Home Screen
            </span>
          </p>

          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-500"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[9999]">
      <div className="bg-white border border-hairline text-ink rounded-panel p-4 shadow-pop flex items-center justify-between gap-4">

        <div>
          <h3 className="font-extrabold text-base">
            Install App
          </h3>

          <p className="text-xs text-ink-secondary">
            Faster ordering experience
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="min-h-10 px-4 rounded-card text-sm font-bold bg-brand text-white hover:bg-brand-strong transition"
          >
            Install
          </button>

          <button
            onClick={handleClose}
            className="min-h-10 px-3 rounded-card text-sm font-bold text-ink-secondary hover:bg-subtle transition"
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}
