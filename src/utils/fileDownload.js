import { Share } from "@capacitor/share";
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

export const isShareCancelled = error => error?.name === "AbortError" ||
  /\b(cancelled|canceled|dismissed)\b/i.test(error?.message || "");

export const fileExportMessage = result => result.status === "cancelled"
  ? "Sharing cancelled. No file was sent."
  : result.status === "shared"
    ? "Share sheet opened. Confirm the destination in the app you choose."
    : "Download started. Check your browser downloads.";

// Native sharing uses cache-backed URIs without broad storage permissions.
// Browsers without file sharing (or transient activation) retain downloads.
export const downloadFile = async (blob, filename, options = {}) => {
  const native = isNativeApp();
  if (native) {
    const uri = await writeTempShareFile(blob, filename);
    if (!uri) throw new Error("Could not prepare the file for sharing.");
    try {
      await Share.share({ title: options.title || filename, text: options.text,
        files: [uri], dialogTitle: options.dialogTitle || "Save or share file" });
      return { native, status: "shared", uri, label: null };
    } catch (error) {
      if (isShareCancelled(error)) return { native, status: "cancelled", uri: null, label: null };
      throw error;
    }
  }
  const file = typeof File === "function" ? new File([blob], filename, { type: blob.type }) : null;
  try {
    if (file && typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: options.title || filename, ...(options.text ? { text: options.text } : {}) });
      return { native, status: "shared", uri: null, label: null };
    }
  } catch (error) {
    if (isShareCancelled(error)) return { native, status: "cancelled", uri: null, label: null };
  }
  triggerBrowserDownload(blob, filename);
  return { native, status: "downloaded", uri: null, label: null };
};
