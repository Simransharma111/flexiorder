import {
  FiCalendar,
  FiX,
} from "react-icons/fi";


export default function ScheduleModal({
  show,
  close,
  onContinue,
}) {


if(!show)
return null;



return (

<div

className="
fixed
inset-0
z-[110]
bg-black/50
flex
items-end
md:items-center
justify-center
p-4
"

onClick={close}

>


<div

className="
bg-white
w-full
max-w-md
rounded-2xl
p-6
"

onClick={(e)=>
e.stopPropagation()
}

>



{/* HEADER */}

<div className="
flex
items-center
justify-between
">

<div className="
flex
items-center
gap-3
">


<div className="
w-10
h-10
rounded-xl
bg-orange-50
text-orange-600
flex
items-center
justify-center
">

<FiCalendar/>

</div>



<h2 className="
text-lg
font-bold
text-gray-900
">

Schedule Order

</h2>



</div>



<button

onClick={close}

className="
w-9
h-9
rounded-full
bg-gray-100
flex
items-center
justify-center
"

>

<FiX/>

</button>



</div>





{/* CONTENT */}


<p className="
text-sm
text-gray-500
mt-4
leading-6
">

Your cart is ready. Continue to cart
page to select the date and time
for your scheduled order.

</p>





{/* ACTION */}


<button

onClick={onContinue}

className="
w-full
mt-5
bg-orange-500
hover:bg-orange-600
text-white
py-3
rounded-xl
font-bold
"

>

Continue to Cart

</button>




</div>


</div>


);


}