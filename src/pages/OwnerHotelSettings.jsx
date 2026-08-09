import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  FaPen,
  FaSave,
  FaImage,
} from "react-icons/fa";

import { HOTEL_THEME_CHOICES } from "../constants/hotelThemes";
import { getHotelThemeStyle, resolveHotelTheme } from "../utils/hotelTheme";
import {
  APP_LEVELS,
  appLevelAllows,
  getFeaturesForLevel,
  hydrateHotelFeatures,
  normalizeFeatureSettings,
  persistFeatureSettings,
} from "../utils/featureSettings";




export default function OwnerHotelSettings({ onHotelChange }){

const navigate=useNavigate();


const [hotel,setHotel]=useState(null);

const [loading,setLoading]=useState(false);


const [logo,setLogo]=useState(null);

const [cover,setCover]=useState(null);


const [logoPreview,setLogoPreview]=useState("");

const [coverPreview,setCoverPreview]=useState("");





/* =========================================================
   LOAD HOTEL
========================================================= */

const fetchHotel=useCallback(async()=>{

try{


const res=await api.get(
"/hotel/me"
);


let data=hydrateHotelFeatures(res.data?.hotel || res.data);

if (data) {
  const gstEnabled = Boolean(data.gstEnabled ?? data.enableGST ?? data.gst?.enabled ?? false);
  const gstPercentage = Number(data.gstPercentage ?? data.gstRate ?? data.gst?.percentage ?? data.gst?.rate ?? 0);
  const menuMode = data.menuMode ?? data.menuDisplayMode ?? (data.simpleMenu ? "simple" : "visual") ?? "visual";
  data = { ...data, gstEnabled, gstPercentage, menuMode };
}

setHotel(data);
onHotelChange?.(data);


setLogoPreview(
data.logo
);


setCoverPreview(
data.coverImage
);


}catch(err){

console.log(err);

}

}, [onHotelChange]);

useEffect(()=>{
  fetchHotel();
},[fetchHotel]);





/* =========================================================
   INPUT UPDATE
========================================================= */


const updateField=(field,value)=>{


setHotel((previous) => {
  const next = { ...previous, [field]: value };
  onHotelChange?.(next);
  return next;
});


};

const updateFeatureSetting=(field,value)=>{
  setHotel((previous) => {
    const featureSettings = normalizeFeatureSettings({
      ...previous.featureSettings,
      [field]: value,
    });
    const next = { ...previous, featureSettings };
    onHotelChange?.(next);
    return next;
  });
};

const updateStaffCapability=(capability,value)=>{
  const current = normalizeFeatureSettings(hotel?.featureSettings);
  updateFeatureSetting("staffCapabilities", {
    ...current.staffCapabilities,
    [capability]: value,
  });
};





/* =========================================================
   PROFILE SAVE
========================================================= */


const saveProfile=async()=>{


try{


setLoading(true);

const featureSettings = normalizeFeatureSettings(hotel.featureSettings);


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
    orderingEnabled: hotel.orderingEnabled !== false,
    gstEnabled: Boolean(hotel.gstEnabled),
    enableGST: Boolean(hotel.gstEnabled),
    gst: {
      enabled: Boolean(hotel.gstEnabled),
      percentage: Number(hotel.gstPercentage || 0),
      rate: Number(hotel.gstPercentage || 0),
    },
    gstPercentage: Number(hotel.gstPercentage || 0),
    gstRate: Number(hotel.gstPercentage || 0),
    menuMode: hotel.menuMode || "visual",
    menuDisplayMode: hotel.menuMode || "visual",
    simpleMenu: hotel.menuMode === "simple",
    appLevel: featureSettings.appLevel,
    publicDisplayEnabled: featureSettings.publicDisplayEnabled,
    staffCapabilities: featureSettings.staffCapabilities,
    featureSettings,
  }
);

let data = hydrateHotelFeatures(res.data?.hotel || res.data || hotel);
if (data) {
  const gstEnabled = Boolean(data.gstEnabled ?? data.enableGST ?? data.gst?.enabled ?? false);
  const gstPercentage = Number(data.gstPercentage ?? data.gstRate ?? data.gst?.percentage ?? data.gst?.rate ?? 0);
  const menuMode = data.menuMode ?? data.menuDisplayMode ?? (data.simpleMenu ? "simple" : "visual") ?? "visual";
  data = { ...data, gstEnabled, gstPercentage, menuMode };
}

setHotel(data);
onHotelChange?.(data);

persistFeatureSettings(data, featureSettings);


alert(
"Profile updated successfully"
);



}catch(err){

console.log(err);

alert(
"Profile update failed"
);


}
finally{

setLoading(false);

}


};

const saveAppSettings=async()=>{
  const featureSettings = persistFeatureSettings(
    hotel,
    normalizeFeatureSettings(hotel.featureSettings)
  );
  try {
    setLoading(true);
    await api.patch("/hotel/profile", {
      appLevel: featureSettings.appLevel,
      publicDisplayEnabled: featureSettings.publicDisplayEnabled,
      staffCapabilities: featureSettings.staffCapabilities,
      featureSettings,
    });
    alert("App settings saved");
  } catch (error) {
    console.warn("Cloud feature settings update failed", error);
    alert("App settings saved on this device. Cloud update will require backend support.");
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



if(logo){

form.append(
"logo",
logo
);

}



if(cover){

form.append(
"coverImage",
cover
);

}



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


let data = hydrateHotelFeatures(res.data?.hotel || res.data || hotel);
if (data) {
  const gstEnabled = Boolean(data.gstEnabled ?? data.enableGST ?? data.gst?.enabled ?? false);
  const gstPercentage = Number(data.gstPercentage ?? data.gstRate ?? data.gst?.percentage ?? data.gst?.rate ?? 0);
  const menuMode = data.menuMode ?? data.menuDisplayMode ?? (data.simpleMenu ? "simple" : "visual") ?? "visual";
  data = { ...data, gstEnabled, gstPercentage, menuMode };
}

setHotel(data);
onHotelChange?.(data);

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







const changeTheme=(theme)=>{
  setHotel((previous) => {
    const next = {
      ...previous,
      theme: {
        id: theme.id,
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        brand: theme.brand,
        text: theme.text || "#FFFFFF",
        mode: theme.mode || "dark",
      },
    };
    onHotelChange?.(next);
    return next;
  });

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
 COVER
===================================================== */}



<div className="
relative
">


<img

src={
coverPreview ||
"/default-cover.jpg"
}

className="
w-full
h-32 md:h-40
object-cover
rounded-3xl
border border-white/20
"

/>




<label

className="
absolute
top-5
right-5
bg-white
text-black
p-4
rounded-full
cursor-pointer
shadow-lg
"


>


<FaPen/>


<input

type="file"

hidden

accept="image/*"


onChange={(e)=>{


const file=e.target.files[0];


setCover(file);


setCoverPreview(
URL.createObjectURL(file)
);


}}

/>


</label>



</div>









{/* =====================================================
 PROFILE HEADER
===================================================== */}



<div className="
relative
-mt-16
ml-8
">


<div className="
relative
w-fit
">


<img

src={
logoPreview ||
"/logo.png"
}


className="
w-20
h-20
rounded-full
border-4
border-white
object-cover
shadow-xl
"

/>



<label

className="
absolute
bottom-2
right-2
bg-white
text-black
p-3
rounded-full
cursor-pointer
"


>


<FaPen/>


<input

hidden

type="file"

accept="image/*"


onChange={(e)=>{


const file=e.target.files[0];


setLogo(file);


setLogoPreview(
URL.createObjectURL(file)
);


}}

/>


</label>



</div>




<h1 className="
text-xl
font-bold
mt-5
">

{hotel.name}

</h1>


<p className="opacity-70">

{hotel.tagline}

</p>



</div>








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

  <button type="button" disabled={loading} onClick={saveAppSettings} className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-black">
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
      onChange={(event) => updateField("orderingEnabled", event.target.checked)}
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
        value={hotel.gstPercentage || ""}
        onChange={(event) => updateField("gstPercentage", event.target.value)}
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
    disabled={loading}
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

Theme

</h2>



<div className="
grid
md:grid-cols-3
gap-4
">


{
  HOTEL_THEME_CHOICES.map((theme) => (

<button

key={theme.id}

onClick={()=>changeTheme(theme)}

className="
p-5
rounded-2xl
text-left
border-2
"

style={{

background:
theme.secondary,

borderColor:
hotel?.theme?.id === theme.id
?
theme.accent
:
"transparent"

}}

>


<h3
style={{
color:theme.accent
}}

className="font-bold"
>

{theme.label}

</h3>




<div className="
flex
gap-2
mt-4
">

<span
className="
w-8
h-8
rounded-full
"
style={{
background:theme.primary
}}
/>


<span
className="
w-8
h-8
rounded-full
"
style={{
background:theme.secondary
}}
/>



<span
className="
w-8
h-8
rounded-full
"
style={{
background:theme.accent
}}
/>


</div>


</button>


))
}



</div>



</section>









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
