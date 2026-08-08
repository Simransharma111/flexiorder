import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  FaPen,
  FaSave,
  FaImage,
} from "react-icons/fa";

import HOTEL_THEMES from "../constants/hotelThemes";




export default function OwnerHotelSettings(){


const [hotel,setHotel]=useState(null);

const [loading,setLoading]=useState(false);


const [logo,setLogo]=useState(null);

const [cover,setCover]=useState(null);


const [logoPreview,setLogoPreview]=useState("");

const [coverPreview,setCoverPreview]=useState("");





/* =========================================================
   LOAD HOTEL
========================================================= */

useEffect(()=>{

fetchHotel();

},[]);



const fetchHotel=async()=>{

try{


const res=await api.get(
"/hotel/me"
);


const data=res.data.hotel;


setHotel(data);


setLogoPreview(
data.logo
);


setCoverPreview(
data.coverImage
);


}catch(err){

console.log(err);

}

};





/* =========================================================
   INPUT UPDATE
========================================================= */


const updateField=(field,value)=>{


setHotel(prev=>({

...prev,

[field]:value

}));


};





/* =========================================================
   PROFILE SAVE
========================================================= */


const saveProfile=async()=>{


try{


setLoading(true);


await api.patch(
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
    gstPercentage: Number(hotel.gstPercentage || 0),
  }
);


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



form.append(
"themeId",
hotel.theme.id
);



form.append(
"themePrimary",
hotel.theme.primary
);



form.append(
"themeSecondary",
hotel.theme.secondary
);



form.append(
"themeAccent",
hotel.theme.accent
);

form.append(
  "menuMode",
  hotel.menuMode || "visual"
);




await api.patch(
  "/hotel/branding",
  form,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }
);



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

setHotel(prev=>({

...prev,

theme:{
  id:theme.id,
  primary:theme.primary,
  secondary:theme.secondary,
  accent:theme.accent,
  text: theme.text || "#FFFFFF",
  mode: theme.mode || "dark"
}

}));

};

const activeTheme =
hotel?.theme?.id &&
HOTEL_THEMES[hotel.theme.id]
?
HOTEL_THEMES[hotel.theme.id]
:
HOTEL_THEMES.midnight_moss;


const resolvedPrimary =
hotel?.theme?.primary ||
activeTheme.primary;


const resolvedSecondary =
hotel?.theme?.secondary ||
activeTheme.secondary;


const resolvedText =
hotel?.theme?.text ||
activeTheme.text;




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


<div

className="
min-h-screen
p-5
md:p-10
"

style={{

background: resolvedSecondary,

color: resolvedText

}}

>



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
h-72
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
w-36
h-36
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
text-3xl
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





<button

onClick={saveProfile}

className="
mt-5
px-6
py-3
rounded-xl
font-bold
bg-white
text-black
flex
gap-2
items-center
"


>

<FaSave/>

Save Profile

</button>



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
  Object.values(HOTEL_THEMES).map((theme) => (

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

{theme.name}

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

style={{

background: resolvedPrimary

}}

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
