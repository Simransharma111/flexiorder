import React from "react";

import {
  FiExternalLink,
  FiShoppingBag,
  FiGrid,
  FiMapPin,
} from "react-icons/fi";


export default function TableCard({

table,
onOrder,

}){


const menuUrl =
`${import.meta.env.VITE_FRONTEND_URL}/qr/${table.qrId}`;



return (

<div

className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
hover:bg-white/10
transition
"

>





{/* HEADER */}

<div

className="
flex
justify-between
items-start
gap-3
"

>


<div>


<p

className="
text-orange-400
text-xs
font-bold
uppercase
"

>

{table.type}

</p>



<h2

className="
text-xl
font-black
mt-1
"

>

{

table.type==="room"

?

`Room ${table.tableNumber}`

:

`Table ${table.tableNumber}`

}


</h2>


</div>





<div

className="
rounded-full
px-3
py-1
text-xs
font-bold
bg-green-500/20
text-green-400
"

>

Available

</div>


</div>









{/* QR SECTION */}

<div

className="
mt-5
rounded-2xl
bg-black/20
p-4
"

>


<div

className="
flex
items-center
gap-2
"

>


<FiGrid

className="
text-orange-400
"

/>


<span

className="
font-semibold
text-sm
"

>

QR Ordering

</span>


</div>





<p

className="
text-xs
text-slate-400
mt-2
"

>

{

table.qrId

?

"✅ QR Active - Guest can scan and order"

:

"⚠️ QR not assigned"

}


</p>



</div>









{/* ACTION BUTTONS */}

<div

className="
mt-5
grid
grid-cols-2
gap-3
"

>





{/* GUEST QR */}

{

table.qrId &&

<a

href={menuUrl}

target="_blank"

rel="noreferrer"

className="
flex
items-center
justify-center
gap-2
rounded-xl
bg-orange-500
py-3
text-sm
font-bold
"

>

<FiExternalLink size={15}/>

QR Menu

</a>


}





{/* STAFF ORDER */}

<button

onClick={()=>onOrder(table)}

className="
flex
items-center
justify-center
gap-2
rounded-xl
bg-blue-500
py-3
text-sm
font-bold
"

>


<FiShoppingBag size={15}/>

Staff Order


</button>




</div>









{/* TABLE INFO */}

<div

className="
mt-4
flex
items-center
gap-2
text-xs
text-slate-400
"

>


<FiMapPin size={13}/>


{

table.type==="room"

?

`Room ${table.tableNumber}`

:

`Table ${table.tableNumber}`

}


</div>









{/* QR ID */}

{

table.qrId &&

<p

className="
mt-3
text-[11px]
text-slate-500
truncate
"

>

QR ID:
{" "}
{table.qrId}

</p>


}



</div>


);


}