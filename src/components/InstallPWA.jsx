import { useEffect, useState } from "react";

let deferredPrompt;

export default function InstallPWA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("User installed app");
    }

    deferredPrompt = null;
    setShow(false);
  };

  const handleClose = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[9999]">
      <div className="bg-[#111827] border border-white/10 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-lg">

        <div>
          <h3 className="font-bold text-lg">Install App</h3>
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