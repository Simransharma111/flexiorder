import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export const isNativeApp = () =>
  typeof Capacitor?.isNativePlatform === "function" && Capacitor.isNativePlatform();

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the generated file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

// Native: blob downloads and window.open are unreliable inside the app shell,
// so files are written where the owner can actually find them. Directory.
// Downloads is restricted on newer Android (scoped storage), so write through
// external storage into the real Download folder, with Documents as fallback.
export const saveFileToDownloads = async (blob, filename) => {
  const data = await blobToBase64(blob);
  const attempts = [
    {
      path: `Download/FlexiOrder/${filename}`,
      directory: Directory.ExternalStorage,
      label: `Downloads/FlexiOrder/${filename}`,
    },
    {
      path: `FlexiOrder/${filename}`,
      directory: Directory.Documents,
      label: `Documents/FlexiOrder/${filename}`,
    },
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const result = await Filesystem.writeFile({
        path: attempt.path,
        data,
        directory: attempt.directory,
        recursive: true,
      });
      return { uri: result?.uri || attempt.label, label: attempt.label };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Could not save the file.");
};

// Temporary copy for opening the native share/print sheet.
export const writeTempShareFile = async (blob, filename) => {
  const data = await blobToBase64(blob);
  const result = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  return result?.uri;
};

// Web fallback: classic blob download anchor.
export const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};

// Unified: native saves into Downloads/FlexiOrder, web uses the browser.
export const downloadFile = async (blob, filename) => {
  if (isNativeApp()) {
    const saved = await saveFileToDownloads(blob, filename);
    return { native: true, uri: saved.uri, label: saved.label };
  }
  triggerBrowserDownload(blob, filename);
  return { native: false, uri: null, label: null };
};
