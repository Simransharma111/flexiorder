import React from "react";
import {
  FiActivity,
  FiPackage
} from "react-icons/fi";


function hexToRgba(hex, alpha = 1) {

  if (!hex) {
    return `rgba(255,255,255,${alpha})`;
  }


  let h = hex.replace("#", "");

  if (h.length === 3) {
    h = h
      .split("")
      .map((c)=>c+c)
      .join("");
  }


  const num=parseInt(h,16);


  const r=(num>>16)&255;
  const g=(num>>8)&255;
  const b=num&255;


  return `rgba(${r},${g},${b},${alpha})`;

}



export default function DashboardHero({
  hotel,
  onChangeTab,
  theme
}){


const background = hotel?.coverImage

?
`
linear-gradient(
90deg,
${hexToRgba(theme.secondaryColor,0.95)},
${hexToRgba(theme.secondaryColor,0.60)}
),
url(${hotel.coverImage})
`

:

hexToRgba(theme.secondaryColor,1);



return (

<div
className="
relative
overflow-hidden
rounded-3xl
border
p-6
"
style={{
backgroundImage:background,
backgroundSize:"cover",
backgroundPosition:"center",
borderColor:theme.borderColor,
color:theme.text
}}
>


<div className="relative z-10 max-w-2xl">


<div className="flex items-center gap-4 mb-5">


{
hotel?.logo &&

<img
src={hotel.logo}
alt={hotel.name}
className="
h-20
w-20
rounded-2xl
object-cover
border
border-white/30
"
/>

}



<div>

<h1 className="text-3xl font-bold">

{hotel?.name || "Your Hotel"}

</h1>


<p className="text-gray-200">

{hotel?.tagline}

</p>


</div>


</div>



<p
className="text-sm font-medium"
style={{
color:theme.accentColor
}}
>
Welcome back
</p>



<h2 className="mt-1 text-2xl font-bold md:text-3xl">

Manage your restaurant

</h2>



<p
className="mt-2 text-sm leading-6"
style={{
color:theme.mutedText
}}
>

Monitor orders, manage your menu,
coordinate kitchen operations and grow your business.

</p>




<div className="mt-5 flex gap-3 flex-wrap">


<button

onClick={()=>onChangeTab("kitchen")}

className="
flex
items-center
gap-2
rounded-xl
px-4
py-2.5
text-sm
font-semibold
text-white
"

style={{
background:theme.primaryColor
}}

>

<FiActivity size={16}/>

Open Kitchen

</button>



<button

onClick={()=>onChangeTab("menu")}

className="
flex
items-center
gap-2
rounded-xl
px-4
py-2.5
text-sm
font-semibold
border
"

style={{

background:hexToRgba(theme.text,0.08),

borderColor:theme.borderColor,

color:theme.text

}}

>

<FiPackage size={16}/>

Manage Menu

</button>



</div>



</div>



<div

className="
absolute
-right-20
-top-20
h-56
w-56
rounded-full
blur-3xl
opacity-20
"

style={{

background:theme.primaryColor

}}

></div>



</div>


)

}