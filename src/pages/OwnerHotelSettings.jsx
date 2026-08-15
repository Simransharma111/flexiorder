import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import {
  FaSave,
  FaImage,
} from "react-icons/fa";

import { getHotelThemeStyle, resolveHotelTheme } from "../utils/hotelTheme";
import {
  APP_LEVELS,
  applyHotelSettingsUpdate,
  appLevelAllows,
  getFeaturesForLevel,
  hydrateHotelFeatures,
  normalizeFeatureSettings,
  persistFeatureSettings,
} from "../utils/featureSettings";

const hasOwn = (value, field) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, field);

const normalizeHotelSettings = (value) => {
  if (!value) return value;
  const rawRate = Number(
    value.gstPercentage ?? value.gstRate ?? value.gst?.percentage ?? value.gst?.rate ?? 0
  );
  const legacyMenuMode = value.menuDisplayMode ?? (value.simpleMenu ? "simple" : "visual");
  const rawMenuMode = value.menuMode ?? legacyMenuMode;

  return {
    ...value,
    gstEnabled: Boolean(value.gstEnabled ?? value.enableGST ?? value.gst?.enabled ?? false),
    gstPercentage: Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 100 ? rawRate : 0,
    menuMode: ["visual", "simple"].includes(rawMenuMode) ? rawMenuMode : "visual",
  };
};

const getSettingsPayload = (hotel) => {
  const gstPercentage = hotel.gstPercentage === "" ? 0 : Number(hotel.gstPercentage);
  if (typeof hotel.gstEnabled !== "boolean") {
    throw new Error("Choose whether GST is enabled before saving.");
  }
  if (!Number.isFinite(gstPercentage) || gstPercentage < 0 || gstPercentage > 100) {
    throw new Error("GST percentage must be a number from 0 through 100.");
  }
  if (!["visual", "simple"].includes(hotel.menuMode)) {
    throw new Error("Choose either Visual menu or Simple menu before saving.");
  }

  return {
    menuMode: hotel.menuMode,
    gstEnabled: hotel.gstEnabled,
    gstPercentage,
  };
};

const confirmsSettings = (hotel, submitted) => (
  hasOwn(hotel, "menuMode") &&
  hasOwn(hotel, "gstEnabled") &&
  hasOwn(hotel, "gstPercentage") &&
  hotel.menuMode === submitted.menuMode &&
  hotel.gstEnabled === submitted.gstEnabled &&
  hotel.gstPercentage === submitted.gstPercentage
);




export default function OwnerHotelSettings({ onHotelChange }){

const navigate=useNavigate();


const [hotel,setHotel]=useState(null);

const [loading,setLoading]=useState(false);
const [orderingLoading,setOrderingLoading]=useState(false);
const orderingRequestRevision=useRef(0);
const settingsRevision=useRef(0);
const confirmedHotelRef=useRef(null);















/* =========================================================
   LOAD HOTEL
========================================================= */

const fetchHotel=useCallback(async()=>{

try{

const requestRevision=settingsRevision.current;


const res=await api.get(
"/hotel/me"
);


const data=normalizeHotelSettings(hydrateHotelFeatures(res.data?.hotel || res.data));

if (requestRevision !== settingsRevision.current) return;

confirmedHotelRef.current=data;
setHotel(data);


}catch(err){

console.log(err);

}

}, []);

useEffect(()=>{
  fetchHotel();
},[fetchHotel]);

useEffect(() => {
  if (hotel) onHotelChange?.(hotel);
}, [hotel, onHotelChange]);

useEffect(() => {
  const hotelId = hotel?._id || hotel?.id;
  if (!hotelId) return undefined;
  socket.emit("joinHotelSettings", String(hotelId));
  const joinHotel = () => socket.emit("joinHotelSettings", String(hotelId));
  const handleSettingsUpdate = (payload) => {
    setHotel((current) => {
      const next = applyHotelSettingsUpdate(current, payload);
      if (next === current) return current;
      settingsRevision.current += 1;
      const confirmedCurrent = confirmedHotelRef.current;
      const confirmedNext = applyHotelSettingsUpdate(confirmedCurrent, payload);
      if (confirmedNext !== confirmedCurrent) {
        confirmedHotelRef.current = confirmedNext;
      }
      const incomingOrdering = payload?.orderingEnabled ?? payload?.hotel?.orderingEnabled;
      if (typeof incomingOrdering === "boolean") {
        setOrderingLoading(false);
      }
      return next;
    });
  };
  socket.on("connect", joinHotel);
  socket.on("hotelSettingsUpdated", handleSettingsUpdate);
  return () => {
    socket.emit("leaveHotelSettings", String(hotelId));
    socket.off("connect", joinHotel);
    socket.off("hotelSettingsUpdated", handleSettingsUpdate);
  };
}, [hotel?._id, hotel?.id]);





/* =========================================================
   INPUT UPDATE
========================================================= */


const updateField=(field,value)=>{


setHotel((previous) => {
  return { ...previous, [field]: value };
});


};

const updateFeatureSetting=(field,value)=>{
  setHotel((previous) => {
    const featureSettings = normalizeFeatureSettings({
      ...previous.featureSettings,
      [field]: value,
    });
    return { ...previous, featureSettings };
  });
};

const updateStaffCapability=(capability,value)=>{
  const current = normalizeFeatureSettings(hotel?.featureSettings);
  updateFeatureSetting("staffCapabilities", {
    ...current.staffCapabilities,
    [capability]: value,
  });
};

const updateOrderingEnabled=async(value)=>{
  if (!hotel || orderingLoading || loading || typeof value !== "boolean") return;
  const previousHotel = hotel;
  const requestRevision = ++orderingRequestRevision.current;
  updateField("orderingEnabled", value);
  setOrderingLoading(true);

  try {
    const response = await api.patch("/hotel/profile", {
      orderingEnabled: value,
    });
    if (requestRevision !== orderingRequestRevision.current) return;
    let confirmedHotel = response.data?.hotel || response.data;
    if (typeof confirmedHotel?.orderingEnabled !== "boolean") {
      const verify = await api.get("/hotel/me");
      confirmedHotel = verify.data?.hotel || verify.data;
    }
    if (typeof confirmedHotel?.orderingEnabled !== "boolean") {
      throw new Error("The restaurant did not confirm the ordering setting.");
    }
    if (confirmedHotel.orderingEnabled !== value) {
      throw new Error("The restaurant kept the previous ordering setting. Please try again.");
    }
    setHotel((current) => {
      const next = {
        ...current,
        orderingEnabled: confirmedHotel.orderingEnabled,
        updatedAt: confirmedHotel.updatedAt || current?.updatedAt,
      };
      confirmedHotelRef.current = {
        ...confirmedHotelRef.current,
        orderingEnabled: confirmedHotel.orderingEnabled,
        updatedAt: confirmedHotel.updatedAt || confirmedHotelRef.current?.updatedAt,
      };
      return next;
    });
  } catch (error) {
    if (requestRevision !== orderingRequestRevision.current) return;
    setHotel((current) => {
      const next = { ...current, orderingEnabled: previousHotel.orderingEnabled };
      return next;
    });
    alert(error?.response?.data?.message || "Customer ordering could not be updated.");
  } finally {
    if (requestRevision === orderingRequestRevision.current) {
      setOrderingLoading(false);
    }
  }
};





/* =========================================================
   PROFILE SAVE
========================================================= */


const saveProfile=async()=>{


try{


setLoading(true);

const featureSettings = normalizeFeatureSettings(hotel.featureSettings);
const submittedSettings = getSettingsPayload(hotel);
const saveRequestRevision = settingsRevision.current;


const res = await api.patch(
  "/hotel/profile",
  {
    tagline: hotel.tagline,
    description: hotel.description,
    address: hotel.address,
    phone: hotel.phone,
    email: hotel.email,
    website: hotel.website,
    instagram: hotel.instagram,
    whatsapp: hotel.whatsapp,
    ...submittedSettings,
    appLevel: featureSettings.appLevel,
    publicDisplayEnabled: featureSettings.publicDisplayEnabled,
    godModeEnabled: featureSettings.godModeEnabled,
    staffCapabilities: featureSettings.staffCapabilities,
    featureSettings,
  }
);

let confirmedResponse = res.data?.hotel || res.data;
// Some deployments/proxies return a successful envelope before the updated
// document has been serialized.  Re-read the authoritative hotel once before
// showing a false "not confirmed" error.
if (!confirmsSettings(confirmedResponse, submittedSettings)) {
  try {
    const verify = await api.get("/hotel/me");
    const verifiedHotel = verify.data?.hotel || verify.data;
    if (confirmsSettings(verifiedHotel, submittedSettings)) {
      confirmedResponse = verifiedHotel;
    }
  } catch {
    // Keep the original response so the user receives the meaningful error.
  }
}
if (!confirmsSettings(confirmedResponse, submittedSettings)) {
  if (
    ["visual", "simple"].includes(confirmedResponse?.menuMode) &&
    typeof confirmedResponse?.gstEnabled === "boolean" &&
    typeof confirmedResponse?.gstPercentage === "number"
  ) {
    const responseHotel = normalizeHotelSettings(
      hydrateHotelFeatures(confirmedResponse)
    );
    confirmedHotelRef.current = saveRequestRevision === settingsRevision.current
      ? responseHotel
      : {
        ...responseHotel,
        orderingEnabled: confirmedHotelRef.current?.orderingEnabled,
        featureSettings: confirmedHotelRef.current?.featureSettings,
        updatedAt: confirmedHotelRef.current?.updatedAt || responseHotel.updatedAt,
      };
  }
  throw new Error("The restaurant did not confirm the saved menu and GST settings.");
}
const data = normalizeHotelSettings(hydrateHotelFeatures(confirmedResponse));
const concurrentConfirmed = confirmedHotelRef.current;

setHotel(() => {
  const next = saveRequestRevision === settingsRevision.current
    ? data
    : {
      ...data,
      orderingEnabled: concurrentConfirmed?.orderingEnabled,
      featureSettings: concurrentConfirmed?.featureSettings,
      updatedAt: concurrentConfirmed?.updatedAt || data.updatedAt,
    };
  confirmedHotelRef.current = next;
  return next;
});

persistFeatureSettings(data, featureSettings);


alert(
"Profile updated successfully"
);



}catch(err){

console.log(err);

if (confirmedHotelRef.current) {
  setHotel(confirmedHotelRef.current);
}

alert(
err?.response?.data?.message || err?.message || "Profile update failed"
);


}
finally{

setLoading(false);

}


};

const saveAppSettings=async()=>{
  const featureSettings = normalizeFeatureSettings(hotel.featureSettings);
  try {
    setLoading(true);
    await api.patch("/hotel/profile", {
      appLevel: featureSettings.appLevel,
      publicDisplayEnabled: featureSettings.publicDisplayEnabled,
      godModeEnabled: featureSettings.godModeEnabled,
      staffCapabilities: featureSettings.staffCapabilities,
      featureSettings,
    });
    persistFeatureSettings(hotel, featureSettings);
    alert("App settings saved");
  } catch (error) {
    console.warn("Cloud feature settings update failed", error);
    alert("App settings could not be saved. Please try again.");
  } finally {
    setLoading(false);
  }
};







/* =========================================================
   BRANDING SAVE
========================================================= */


const saveBranding=async()=>{


try{


setLoading(true);



const form=new FormData();







const theme = resolveHotelTheme(hotel);

form.append("themeId", theme.id);



form.append("themePrimary", theme.primary);



form.append("themeSecondary", theme.secondary);



form.append("themeAccent", theme.accent);

form.append(
  "menuMode",
  hotel.menuMode || "visual"
);

form.append(
  "menuDisplayMode",
  hotel.menuMode || "visual"
);

form.append(
  "simpleMenu",
  String(hotel.menuMode === "simple")
);




const res = await api.patch(
  "/hotel/branding",
  form,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }
);


const data = normalizeHotelSettings(hydrateHotelFeatures(res.data?.hotel || res.data || hotel));

confirmedHotelRef.current=data;
setHotel(data);

alert(
"Branding updated successfully"
);



}catch(err){

console.log(err);

alert(
"Branding update failed"
);


}
finally{

setLoading(false);

}


};







const resolvedTheme = resolveHotelTheme(hotel);
const resolvedPrimary = resolvedTheme.brand;
const featureSettings = normalizeFeatureSettings(hotel?.featureSettings);


if(!hotel){

return (

<div className="
min-h-screen
flex
items-center
justify-center
">

Loading...

</div>

)

}







return(


<div className="owner-settings-compact" style={getHotelThemeStyle(hotel)}>



<div className="
max-w-6xl
mx-auto
space-y-8
">





{/* =====================================================
 PROFILE FORM
===================================================== */}

<section className="bg-white/10 border border-white/20 rounded-3xl p-6">
  <h2 className="text-2xl font-bold mb-2">App level</h2>
  <p className="text-sm opacity-70 mb-5">Choose how many controls your restaurant needs.</p>
  <div className="grid gap-3 sm:grid-cols-3">
    {APP_LEVELS.map((level) => (
      <button
        type="button"
        key={level.id}
        onClick={() => updateFeatureSetting("appLevel", level.id)}
        className={`rounded-xl border-2 p-4 text-left ${
          featureSettings.appLevel === level.id
            ? "border-orange-400 bg-orange-500/10"
            : "border-white/10 bg-black/10"
        }`}
      >
        <strong>{level.label}</strong>
        <span className="mt-1 block text-xs opacity-70">{level.description}</span>
        <span className="app-level-card__count">{getFeaturesForLevel(level.id).length} included features</span>
      </button>
    ))}
  </div>
  <div className="app-level-feature-list" aria-live="polite">
    <h3>{APP_LEVELS.find((level) => level.id === featureSettings.appLevel)?.label} includes</h3>
    <div>
      {getFeaturesForLevel(featureSettings.appLevel).map((feature) => (
        <span key={feature.id}><span aria-hidden="true">✓</span> {feature.label}</span>
      ))}
    </div>
  </div>

  {appLevelAllows(featureSettings.appLevel, "basic") && (
    <div className="mt-5 border-t border-white/10 pt-4">
      <h3 className="font-bold">Staff access</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          ["editMenu", "Edit menu"],
          ["changeOrdering", "Pause customer ordering"],
          ["switchWorkspaces", "Switch Waiter and Kitchen"],
          ["usePublicDisplay", "Open public display"],
        ].map(([capability, label]) => (
          <label key={capability} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-3">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={featureSettings.staffCapabilities[capability] !== false}
              onChange={(event) => updateStaffCapability(capability, event.target.checked)}
            />
          </label>
        ))}
      </div>
      <label className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-3">
        <span>Public order display</span>
        <input
          type="checkbox"
          checked={featureSettings.publicDisplayEnabled}
          onChange={(event) => updateFeatureSetting("publicDisplayEnabled", event.target.checked)}
        />
      </label>
      {featureSettings.publicDisplayEnabled && (
        <button type="button" className="mt-3 rounded-xl border border-white/20 px-4 py-3 font-bold" onClick={() => navigate("/display")}>Open public display</button>
      )}
    </div>
  )}

  <label className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-3">
    <span>
      <strong className="block">God Mode</strong>
      <small className="block opacity-70">Kitchen completes in one tap; waiter uses Ready then Delivered.</small>
    </span>
    <input
      type="checkbox"
      aria-label="God Mode"
      checked={featureSettings.godModeEnabled}
      disabled={loading || orderingLoading}
      onChange={(event) => updateFeatureSetting("godModeEnabled", event.target.checked)}
    />
  </label>

  <button type="button" disabled={loading || orderingLoading} onClick={saveAppSettings} className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-black">
    <FaSave /> Save app settings
  </button>
</section>



<section className="
bg-white/10
border
border-white/20
rounded-3xl
p-6
">


<h2 className="
text-2xl
font-bold
mb-5
">

Hotel Information

</h2>




<textarea

rows="4"

value={
hotel.description || ""
}

onChange={
e=>
updateField(
"description",
e.target.value
)
}

placeholder="Description"

className="
w-full
p-3
rounded-xl
text-black
mb-4
"

/>





<div className="
grid
md:grid-cols-2
gap-4
">


<input

value={
hotel.phone || ""
}

onChange={
e=>
updateField(
"phone",
e.target.value
)
}

placeholder="Phone"

className="
p-3
rounded-xl
text-black
"

/>




<input

value={
hotel.email || ""
}

onChange={
e=>
updateField(
"email",
e.target.value
)
}

placeholder="Email"

className="
p-3
rounded-xl
text-black
"

/>




<input

value={
hotel.website || ""
}

onChange={
e=>
updateField(
"website",
e.target.value
)
}

placeholder="Website"

className="
p-3
rounded-xl
text-black
"

/>



<input

value={
hotel.instagram || ""
}

onChange={
e=>
updateField(
"instagram",
e.target.value
)
}

placeholder="Instagram"

className="
p-3
rounded-xl
text-black
"

/>



</div>







</section>

<section className="
bg-white/10
border
border-white/20
rounded-3xl
p-6
">
  <h2 className="text-2xl font-bold mb-2">
    Customer menu
  </h2>
  <p className="text-sm opacity-70 mb-5">
    Choose the menu style customers see.
  </p>

  <label className="mb-5 flex items-center gap-3 text-sm font-semibold">
    <input
      type="checkbox"
      checked={hotel.orderingEnabled !== false}
      onChange={(event) => updateOrderingEnabled(event.target.checked)}
      disabled={orderingLoading || loading}
      className="h-4 w-4 accent-orange-500"
    />
    Customer ordering enabled
  </label>

  <div className="grid gap-3 sm:grid-cols-2">
    {[
      ["visual", "Visual menu", "Images and larger dish cards"],
      ["simple", "Simple menu", "Compact rows for large menus"],
    ].map(([value, label, description]) => (
      <button
        key={value}
        type="button"
        aria-pressed={(hotel.menuMode || "visual") === value}
        onClick={() => updateField("menuMode", value)}
        className={`rounded-2xl border-2 p-4 text-left ${
          (hotel.menuMode || "visual") === value
            ? "border-orange-400 bg-orange-500/10"
            : "border-white/10 bg-black/10"
        }`}
      >
        <p className="font-bold">{label}</p>
        <p className="mt-1 text-xs opacity-70">{description}</p>
      </button>
    ))}
  </div>
</section>

<section className="
bg-white/10
border
border-white/20
rounded-3xl
p-6
">
  <h2 className="text-2xl font-bold mb-2">GST</h2>
  <p className="text-sm opacity-70 mb-5">
    Show GST in the customer checkout total.
  </p>

  <label className="flex items-center gap-3 text-sm font-semibold">
    <input
      type="checkbox"
      checked={Boolean(hotel.gstEnabled)}
      onChange={(event) => updateField("gstEnabled", event.target.checked)}
      className="h-4 w-4 accent-orange-500"
    />
    Enable GST
  </label>

  {hotel.gstEnabled && (
    <div className="mt-4 max-w-xs">
      <label className="mb-1 block text-sm font-semibold">
        GST percentage
      </label>
      <input
        type="number"
        min="0"
        max="100"
        value={hotel.gstPercentage ?? ""}
        onChange={(event) => updateField(
          "gstPercentage",
          event.target.value === "" ? "" : Number(event.target.value)
        )}
        placeholder="e.g. 5"
        className="w-full rounded-xl border border-white/20 bg-black/10 px-4 py-3 outline-none"
      />
    </div>
  )}
</section>

{/* ── Single save button covers Hotel Info + Customer Menu + GST ── */}
<div className="flex justify-end">
  <button
    onClick={saveProfile}
    disabled={loading || orderingLoading}
    className="
    px-8
    py-3
    rounded-xl
    font-bold
    text-lg
    bg-white
    text-black
    flex
    gap-2
    items-center
    shadow-lg
    "
  >
    <FaSave />
    {loading ? "Saving…" : "Save Settings"}
  </button>
</div>









{/* =====================================================
 THEMES
===================================================== */}












{/* =====================================================
 SAVE BRANDING
===================================================== */}


<button

disabled={loading}

onClick={saveBranding}

className="
w-full
py-4
rounded-2xl
font-bold
text-lg
flex
justify-center
items-center
gap-3
"

style={{ background: resolvedPrimary, color: resolvedTheme.onAccent }}

>


<FaImage/>

{
loading
?
"Saving..."
:
"Save Branding"
}


</button>







</div>


</div>


)


}
