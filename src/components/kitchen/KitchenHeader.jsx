import {
  FiMenu,
  FiBell,
  FiSearch,
  FiMaximize2
} from "react-icons/fi";


export default function KitchenHeader({

hotel,

search,

setSearch,

toggleSidebar,

orderCount = 0

}){


const enterFullscreen = ()=>{


if(!document.fullscreenElement){

document.documentElement.requestFullscreen?.();

}
else{

document.exitFullscreen?.();

}


};





return (

<header

className="
h-20
bg-white
border-b
border-gray-200
sticky
top-0
z-30
flex
items-center
justify-between
px-4
sm:px-6
gap-4
"

>







{/* LEFT */}

<div

className="
flex
items-center
gap-4
min-w-0
"

>


<button

onClick={toggleSidebar}

className="
w-10
h-10
rounded-lg
hover:bg-gray-100
flex
items-center
justify-center
transition
"

>

<FiMenu size={22}/>

</button>






<div
className="
min-w-0
"
>


<h1

className="
text-xl
sm:text-2xl
font-black
truncate
"

>

Kitchen

</h1>



<p

className="
text-xs
sm:text-sm
text-gray-500
truncate
"

>

{
hotel?.name ||
"Restaurant"
}

</p>



</div>


</div>










{/* RIGHT */}

<div

className="
flex
items-center
gap-2
sm:gap-4
"

>





{/* SEARCH */}


<div

className="
hidden
md:flex
items-center
bg-gray-100
rounded-xl
px-3
py-2
"

>


<FiSearch

className="
text-gray-400
"

/>



<input


value={search}


onChange={
e=>setSearch(e.target.value)
}


placeholder="Search table / room"


className="
bg-transparent
outline-none
text-sm
px-2
w-44
"

/>



</div>









{/* NOTIFICATION */}



<button

className="
relative
w-10
h-10
rounded-xl
hover:bg-gray-100
flex
items-center
justify-center
"

>


<FiBell size={20}/>




{
orderCount > 0 &&

<span

className="
absolute
top-1
right-1
bg-red-500
text-white
text-[10px]
font-bold
w-4
h-4
rounded-full
flex
items-center
justify-center
"

>

{
orderCount > 9
?
"9+"
:
orderCount
}

</span>


}




</button>









{/* FULLSCREEN */}



<button

onClick={enterFullscreen}

className="
hidden
sm:flex
items-center
gap-2
bg-gray-900
text-white
px-4
py-2
rounded-xl
text-sm
font-bold
hover:bg-black
transition
"

>


<FiMaximize2/>

<span>
Kitchen Display
</span>


</button>







</div>






</header>


);


}