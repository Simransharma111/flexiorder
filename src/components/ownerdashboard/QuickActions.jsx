
import {
  FiActivity,
  FiPackage,
  FiUsers,
  FiTable,
} from "react-icons/fi";


export default function QuickActions({
  onChangeTab,
  orderStats,
  primaryColor,
  accentColor,
  themeText,
  themeStyles,
}) {


const actions = [

{
key:"kitchen",
title:"Kitchen",
description:`${orderStats.active} active orders`,
icon:FiActivity,
},


{
key:"menu",
title:"Menu",
description:"Manage dishes",
icon:FiPackage,
},


{
key:"staff",
title:"Staff",
description:"Manage team",
icon:FiUsers,
},


{
key:"tables",
title:"QR Tables",
description:"Manage QR codes",
icon:FiTable,
},


];


return (

<section>

<div className="mb-3">

<h2 className="text-lg font-bold">
Quick Actions
</h2>


<p
className="text-xs"
style={{
color:themeStyles.mutedText
}}
>
Manage your restaurant quickly
</p>


</div>



<div className="grid grid-cols-2 gap-3 md:grid-cols-4">


{
actions.map((item)=>{


const Icon=item.icon;


return (

<button

key={item.key}

onClick={()=>onChangeTab(item.key)}

className="
rounded-2xl
border
p-4
text-left
transition
hover:opacity-80
"

style={{

background:
themeStyles.surfaceBg,

borderColor:
themeStyles.borderColor,

color:
themeText

}}

>


<div

className="
mb-4
flex
h-10
w-10
items-center
justify-center
rounded-xl
"

style={{

background:`${primaryColor}25`,

color:accentColor

}}

>

<Icon size={19}/>

</div>


<p className="font-semibold">

{item.title}

</p>


<p

className="mt-1 text-xs"

style={{

color:
themeStyles.mutedText

}}

>

{item.description}

</p>


</button>


)

})

}


</div>


</section>


)

}
