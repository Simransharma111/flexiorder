import OrderRow from "./OrderRow";
import EmptyOrders from "./EmptyOrders";


export default function OrderQueue({

title,

count,

orders,

type,

updateStatus,

getLocation,

getOrderType,

getWaitingMinutes,

nextStatus

}){


const headerStyles={

new:
"bg-orange-500",

preparing:
"bg-blue-600",

ready:
"bg-green-600"

};




return (

<div

className="
bg-white
rounded-2xl
border
shadow-sm
overflow-hidden
"

>






{/* HEADER */}

<div

className={`
px-4
py-3
text-white
flex
items-center
justify-between
${headerStyles[type]}
`

}

>


<h2

className="
font-black
text-lg
"

>

{title}

</h2>




<span

className="
bg-white/20
px-3
py-1
rounded-full
text-sm
font-bold
"

>

{count}

</span>



</div>









{/* TABLE TITLE */}



<div

className="
hidden
md:grid
grid-cols-12
px-4
py-2
bg-gray-50
border-b
text-xs
font-bold
text-gray-500
"

>


<div className="col-span-3">

ORDER

</div>



<div className="col-span-3">

LOCATION

</div>



<div className="col-span-4">

ITEMS

</div>



<div className="col-span-2">

TIME

</div>



</div>









{/* LIST */}


<div

className="
max-h-[65vh]
overflow-y-auto
divide-y
"

>




{
orders.length===0

?

<EmptyOrders/>

:


orders.map(order=>(


<OrderRow

key={order._id}

order={order}

type={type}

updateStatus={updateStatus}

getLocation={getLocation}

getOrderType={getOrderType}

getWaitingMinutes={getWaitingMinutes}

nextStatus={nextStatus}

/>


))


}



</div>






</div>


);


}