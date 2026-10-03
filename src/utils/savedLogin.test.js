import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ platform: "android", available: true, save: vi.fn(), choose: vi.fn(), clearSelection: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => mocks.platform, isNativePlatform: () => mocks.platform !== "web", isPluginAvailable: () => mocks.available },
  registerPlugin: () => mocks,
}));
import { supportsSavedLogin, chooseSavedLogin, saveLoginPassword, clearSavedLoginSelection } from "./savedLogin";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); mocks.platform="android"; mocks.available=true; });
describe("platform saved login", () => {
  it("delegates Android secrets only to its password manager", async () => {
    const storage = { setItem: vi.fn() }; vi.stubGlobal("localStorage", storage);
    mocks.save.mockResolvedValue({status:"saved"});
    expect(await saveLoginPassword("owner@example.test", "test-only-secret")).toEqual({status:"saved"});
    expect(mocks.save).toHaveBeenCalledWith({email:"owner@example.test",password:"test-only-secret"});
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("keeps manual login available on older app builds", async () => {
    mocks.available=false;
    expect(supportsSavedLogin()).toBe(false);
    expect(await chooseSavedLogin()).toEqual({status:"unavailable"});
    expect(mocks.choose).not.toHaveBeenCalled();
  });
  it("does not save empty passwords and never lets provider errors prevent sign-out", async () => {
    expect(await saveLoginPassword("email", "")).toEqual({status:"unavailable"});
    mocks.clearSelection.mockRejectedValue(new Error("unavailable"));
    await expect(clearSavedLoginSelection()).resolves.toBeUndefined();
  });
  it("requires explicit account selection in supporting browsers", async () => {
    mocks.platform="web";vi.stubGlobal("isSecureContext",true);vi.stubGlobal("PasswordCredential",class {});
    const get=vi.fn().mockResolvedValue({type:"password",id:"other@example.test",password:"test"});
    vi.stubGlobal("navigator",{credentials:{get}});
    expect(await chooseSavedLogin()).toEqual({status:"selected",email:"other@example.test",password:"test"});
    expect(get).toHaveBeenCalledWith({password:true,mediation:"required"});
  });
});
