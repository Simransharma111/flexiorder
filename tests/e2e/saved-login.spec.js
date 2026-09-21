import { test, expect } from "@playwright/test";
import { installNativeBridge, isolateTestNetwork, fulfillJson, makeToken, mockStaffWorkspace } from "./helpers";

test.beforeEach(async ({page}) => {
  await isolateTestNetwork(page);
  await installNativeBridge(page);
  await page.addInitScript(() => {
    window.__passwordCalls = [];
    window.__passwordResult = {status:"selected",email:"saved@example.test",password:"test-only-password"};
    window.Capacitor.PluginHeaders.push({name:"SavedLogin",methods:["choose","save","clearSelection"].map(name=>({name,rtype:"promise"}))});
    const original=window.Capacitor.nativePromise;
    window.Capacitor.nativePromise=(plugin,method,options)=>{
      if(plugin!=="SavedLogin") return original(plugin,method,options);
      // Do not record password values, even in the test bridge.
      window.__passwordCalls.push({method,email:options?.email});
      return Promise.resolve(method==="choose"?window.__passwordResult:method==="save"?{status:window.__saveStatus||"saved"}:{});
    };
  });
  await mockStaffWorkspace(page);
});

test("chosen account fills credentials without sending a login request or persisting passwords", async ({page}) => {
  let requests=0;
  await page.route("**/auth/login",route=>{requests++;return fulfillJson(route,{message:"Not expected"},401);});
  await page.goto("/login");
  await page.getByRole("button",{name:"Choose saved account"}).click();
  await expect(page.getByPlaceholder("Email Address")).toHaveValue("saved@example.test");
  await expect(page.locator('input[name="password"]')).toHaveValue("test-only-password");
  expect(requests).toBe(0);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).not.toContain("test-only-password");
});

for(const accepted of [false,true]) test(`save login happens only after authentication succeeds: ${accepted}`,async({page})=>{
  const user={_id:"staff-saved",role:"staff",email:"saved@example.test",hotelId:"hotel-1"};
  await page.route("**/auth/login",route=>fulfillJson(route,accepted?{user,token:makeToken(user._id),hotelSetupCompleted:true}:{message:"Invalid credentials"},accepted?200:401));
  await page.goto("/login");
  await page.getByRole("button",{name:"Choose saved account"}).click();
  await page.getByLabel("Save login",{exact:false}).check();
  if(accepted) await page.evaluate(()=>window.__saveStatus="unavailable");
  await page.getByRole("button",{name:"Login",exact:true}).click();
  if(accepted) await expect(page).toHaveURL(/\/owner\/order$/);
  else await expect(page.getByRole("alert")).toContainText("Invalid credentials");
  const saved=await page.evaluate(()=>window.__passwordCalls.filter(c=>c.method==="save"));
  expect(saved).toHaveLength(accepted?1:0);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).not.toContain("test-only-password");
});

test("cancelling account selection preserves typed fields and manual sign-in", async ({page})=>{
 await page.goto("/login");
 await page.getByPlaceholder("Email Address").fill("manual@example.test");
 await page.evaluate(()=>window.__passwordResult={status:"cancelled"});
 await page.getByRole("button",{name:"Choose saved account"}).click();
 await expect(page.getByPlaceholder("Email Address")).toHaveValue("manual@example.test");
 await expect(page.getByRole("button",{name:"Login",exact:true})).toBeEnabled();
});
