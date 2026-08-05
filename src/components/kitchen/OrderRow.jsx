import {
  FiClock
} from "react-icons/fi";



export default function OrderRow({

order,

type,

updateStatus,

getLocation,

getOrderType,

getWaitingMinutes,

nextStatus

}){



const waiting =
getWaitingMinutes(
order.createdAt
);



const delayed =
waiting >= 15;







const statusBorder={


new:
"border-l-orange-500",


preparing:
"border-l-blue-600",


ready:
"border-l-green-600"



};






return (

<div

className={`
border-l-4
${statusBorder[type]}

px-4
py-4

hover:bg-gray-50

transition

${

delayed

?

"bg-red-50"

:

""

}

`

}

>






{/* DESKTOP ROW */}


<div

className="
hidden
md:grid
grid-cols-12
items-center
gap-2
"

>






{/* ORDER NUMBER */}



<div

className="
col-span-3
"

>


<p

className="
text-xs
text-gray-400
font-semibold
"

>

ORDER

</p>


<h3

className="
font-black
text-lg
"

>

#{order._id.slice(-5)}

</h3>



</div>









{/* LOCATION */}


<div

className="
col-span-3
"

>


<p

className="
font-bold
"

>

{getLocation(order)}

</p>



<p

className="
text-xs
text-gray-500
"

>

{getOrderType(order)}

</p>


</div>









{/* ITEMS */}



<div

className="
col-span-4
"

>


<div

className="
flex
flex-wrap
gap-2
"

>


{

order.items?.map(
(item,index)=>(


<span

key={index}

className="
text-sm
font-medium
"

>


{item.quantity}x {item.name}


</span>


)

)


}


</div>



</div>









{/* TIME */}



<div

className="
col-span-2
flex
items-center
gap-1
font-bold
"

>


<FiClock/>


<span

className={

delayed

?

"text-red-600"

:

"text-gray-700"

}

>

{waiting}m

</span>


</div>





</div>









{/* MOBILE VIEW */}


<div

className="
md:hidden
space-y-2
"

>


<div

className="
flex
justify-between
"

>


<h3

className="
font-black
"

>

#{order._id.slice(-5)}

</h3>



<span

className="
font-bold
"

>

{waiting}m

</span>



</div>




<p className="font-bold">

{getLocation(order)}

</p>




<div>

{

order.items?.map(
(item,index)=>(

<p

key={index}

className="
text-sm
"

>

{item.quantity}x {item.name}

</p>


)

)

}

</div>



</div>









{/* ACTION BUTTON */}






{

type !== "ready"

&&


<button


onClick={()=>


updateStatus(

order._id,

nextStatus(order.status)

)

}


className={`

mt-3

w-full

py-2

rounded-lg

text-white

font-bold

text-sm


${

type==="new"

?

"bg-orange-500 hover:bg-orange-600"

:

"bg-blue-600 hover:bg-blue-700"

}


`}

>


{

type==="new"

?

"ACCEPT ORDER"

:

"MARK READY"

}



</button>



}








{

type==="ready"

&&


<div

className="
mt-3
text-center
text-sm
font-bold
text-green-600
bg-green-50
py-2
rounded-lg
"

>

Waiting for waiter pickup

</div>


}







</div>

);


}