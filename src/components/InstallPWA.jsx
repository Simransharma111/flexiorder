import { useEffect, useRef, useState } from "react";

export default function InstallPWA() {
  const deferredPrompt = useRef(null);

  const [show, setShow] = useState(false);

  const [isIOS, setIsIOS] = useState(false);

  const [isInstalled, setIsInstalled] =
    useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(
      window.navigator.userAgent
    );

    setIsIOS(ios);

    // Detect installed mode
    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone;

    setIsInstalled(installed);

    if (installed) return;

    // Prevent showing again if dismissed
    const dismissed =
      localStorage.getItem(
        "pwa-install-dismissed"
      );

    if (dismissed) return;

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
  }, []);

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

    setShow(false);
  };

  if (isInstalled) return null;

  // iPhone fallback
  if (isIOS && !show) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[9999]">
        <div className="bg-[#111827] border border-white/10 text-white rounded-3xl p-4 shadow-2xl backdrop-blur-lg">
          <h3 className="font-bold text-lg">
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
      <div className="bg-[#111827] border border-white/10 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-lg">

        <div>
          <h3 className="font-bold text-lg">
            Install App
          </h3>

          <p className="text-xs text-gray-400">
            Faster ordering experience
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600"
          >
            Install
          </button>

          <button
            onClick={handleClose}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}