import React from "react";
import { FiLogOut } from "react-icons/fi";

export default function Sidebar({

  hotel,

  activeTab,

  navItems,

  onNavigate,

  onLogout,

  stats,

  primaryColor,

  secondaryColor,

  themeText,

  mutedText,

  borderColor,

}) {


return (

<aside

className="
flex
h-full
flex-col
"

style={{
background:secondaryColor,
color:themeText
}}

>


{/* BRAND */}

<div

className="
border-b
px-5
py-6
"

style={{
borderColor
}}

>


<div className="flex items-center gap-3">


{
hotel?.logo ?

<img

src={hotel.logo}

alt={hotel.name}

className="
h-14
w-14
rounded-2xl
object-cover
shadow-lg
"

/>

:

<div

className="
flex
h-14
w-14
items-center
justify-center
rounded-2xl
text-xl
font-bold
"

style={{

background:primaryColor,

color:"#fff"

}}

>

{
hotel?.name
?.charAt(0)
?.toUpperCase()
||
"H"
}


</div>

}



<div className="min-w-0">


<h2

className="
truncate
text-lg
font-bold
"

>

{
hotel?.name ||
"Hotel"
}

</h2>



<p

className="
text-xs
"

style={{
color:mutedText
}}

>

Owner Dashboard

</p>


</div>


</div>


</div>






{/* MENU */}

<div

className="
flex-1
overflow-y-auto
px-3
py-5
"

>


<p

className="
mb-3
px-3
text-[11px]
font-semibold
uppercase
tracking-widest
"

style={{
color:mutedText
}}

>

Menu

</p>




<div className="space-y-2">


{

navItems.map(item=>{


const Icon=item.icon;


const active=
activeTab===item.key;



return (

<button

key={item.key}

onClick={()=>
onNavigate(item.key)
}

className="
group
flex
w-full
items-center
rounded-2xl
px-4
py-3
transition-all
duration-300
"

style={{

background:

active

?

`${primaryColor}25`

:

"transparent",


color:

active

?

themeText

:

mutedText,


border:

active

?

`1px solid ${primaryColor}`

:

"1px solid transparent"


}}

>


<div

className="
flex
h-10
w-10
items-center
justify-center
rounded-xl
"

style={{

background:

active

?

primaryColor

:

"rgba(255,255,255,0.06)",


color:

active

?

"#fff"

:

mutedText

}}

>


<Icon size={18}/>


</div>



<span

className="
ml-3
flex-1
text-left
font-medium
"

>

{item.label}

</span>





{
item.key==="orders"
&&
stats?.pending>0
&&

<span

className="
rounded-full
px-2.5
py-1
text-[11px]
font-bold
"

style={{

background:primaryColor,

color:"#fff"

}}

>

{
stats.pending
}

</span>

}





</button>

);


})

}



</div>


</div>








{/* FOOTER */}


<div

className="
border-t
p-4
"

style={{
borderColor
}}

>


<button

onClick={onLogout}

className="
flex
w-full
items-center
rounded-2xl
px-4
py-3
transition
hover:bg-red-500/10
"

style={{
color:mutedText
}}

>


<div

className="
flex
h-10
w-10
items-center
justify-center
rounded-xl
bg-red-500/10
text-red-400
"

>

<FiLogOut size={18}/>

</div>



<span className="ml-3 font-medium">

Logout

</span>


</button>


</div>



</aside>


);

}