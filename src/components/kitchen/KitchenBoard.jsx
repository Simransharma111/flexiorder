import OrderQueue from "./OrderQueue";


export default function KitchenBoard({

newOrders,

preparingOrders,

readyOrders,

updateStatus,

getLocation,

getOrderType,

getWaitingMinutes,

nextStatus

}){


return (

<div

className="
px-4
sm:px-6
pb-6
grid
grid-cols-1
xl:grid-cols-3
gap-5
"

>







{/* =====================
    NEW ORDERS
===================== */}


<OrderQueue

title="NEW ORDERS"

count={newOrders.length}

orders={newOrders}

type="new"

updateStatus={updateStatus}

getLocation={getLocation}

getOrderType={getOrderType}

getWaitingMinutes={getWaitingMinutes}

nextStatus={nextStatus}

/>








{/* =====================
    PREPARING
===================== */}



<OrderQueue

title="PREPARING"

count={preparingOrders.length}

orders={preparingOrders}

type="preparing"

updateStatus={updateStatus}

getLocation={getLocation}

getOrderType={getOrderType}

getWaitingMinutes={getWaitingMinutes}

nextStatus={nextStatus}

/>









{/* =====================
    READY
===================== */}



<OrderQueue

title="READY"

count={readyOrders.length}

orders={readyOrders}

type="ready"

updateStatus={updateStatus}

getLocation={getLocation}

getOrderType={getOrderType}

getWaitingMinutes={getWaitingMinutes}

nextStatus={nextStatus}

/>






</div>

);


}