import {
  FiClipboard,
  FiCoffee,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiCheckCircle,
  FiLogOut
} from "react-icons/fi";


import {
  MdRestaurant
} from "react-icons/md";


export default function KitchenSidebar({

hotel,

open,

logout,
navigate

}){


return (

<aside

className={`
fixed
lg:static
left-0
top-0
bottom-0
z-50
bg-gray-900
text-white
flex
flex-col
transition-all
duration-300

${
open
?
"w-64"
:
"w-0 lg:w-20"
}

overflow-hidden

`}

>





{/* =====================
    BRAND
===================== */}


<div
className="
h-20
px-5
flex
items-center
gap-3
border-b
border-white/10
"
>



{
hotel?.logo

?

<img

src={hotel.logo}

alt="hotel"

className="
w-11
h-11
rounded-full
object-cover
bg-white
"

/>


:

<div

className="
w-11
h-11
rounded-full
bg-orange-500
flex
items-center
justify-center
"

>

<MdRestaurant size={24}/>

</div>


}





{
open &&

<div>


<h2
className="
font-bold
text-sm
truncate
"
>

{
hotel?.name ||
"Restaurant"
}

</h2>


<p
className="
text-xs
text-gray-400
"
>

Kitchen Display

</p>


</div>


}



</div>










{/* =====================
    MENU
===================== */}



<nav
className="
flex-1
p-4
space-y-2
"
>




<MenuItem

icon={<MdRestaurant/>}

label="Kitchen"

active

open={open}

/>





<MenuItem

icon={<FiClipboard/>}

label="Orders History"

open={open}

/>






<MenuItem

icon={<FiCoffee/>}

label="Menu"

open={open}

/>






<MenuItem

icon={<FiCheckCircle/>}

label="Dish Availability"

open={open}

/>






<MenuItem

icon={<FiClock/>}

label="Scheduled Orders"

open={open}

/>






<MenuItem

icon={<FiBarChart2/>}

label="Reports"

open={open}

/>






<MenuItem

icon={<FiSettings/>}

label="Settings"

open={open}

/>





</nav>









{/* =====================
    LOGOUT
===================== */}



<div
className="
p-4
border-t
border-white/10
"
>



<button

onClick={logout}

className="
w-full
flex
items-center
justify-center
gap-2
py-3
rounded-xl
bg-red-500/10
text-red-400
hover:bg-red-500/20
font-bold
transition
"

>


<FiLogOut/>


{
open &&
"Logout"
}



</button>



</div>








</aside>


);


}









function MenuItem({

icon,

label,

active=false,

open

}){


return (

<button

className={`
w-full
flex
items-center
gap-3
px-3
py-3
rounded-xl
font-semibold
transition


${
active

?

"bg-orange-500 text-white"

:

"text-gray-300 hover:bg-white/10 hover:text-white"

}


${
!open
?
"justify-center"
:
""
}

`}

title={
!open
?
label
:
""
}

>


<span
className="
text-xl
"
>

{icon}

</span>



{
open &&

<span>
{label}
</span>

}



</button>


);


}