import { Capacitor, registerPlugin } from "@capacitor/core";

const SavedLogin = registerPlugin("SavedLogin");
const native = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SavedLogin");
const browser = () => !Capacitor.isNativePlatform() && globalThis.isSecureContext &&
  typeof globalThis.PasswordCredential === "function" && Boolean(globalThis.navigator?.credentials);

export const supportsSavedLogin = () => Boolean(native() || browser());

// Secrets only cross the platform password-manager boundary. Never persist or log them here.
export const saveLoginPassword = async (email, password) => {
  if (!email || !password) return { status: "unavailable" };
  if (native()) return SavedLogin.save({ email, password });
  if (browser()) {
    await navigator.credentials.store(new PasswordCredential({ id: email, password }));
    return { status: "requested" };
  }
  return { status: "unavailable" };
};

export const chooseSavedLogin = async () => {
  if (native()) return SavedLogin.choose();
  if (browser()) {
    const credential = await navigator.credentials.get({ password: true, mediation: "required" });
    return credential?.type === "password"
      ? { status: "selected", email: credential.id, password: credential.password }
      : { status: "cancelled" };
  }
  return { status: "unavailable" };
};

export const clearSavedLoginSelection = async () => {
  try {
    if (native()) await SavedLogin.clearSelection();
    else if (browser()) await navigator.credentials.preventSilentAccess();
  } catch { /* Signing out must work even when the credential provider is unavailable. */ }
};
