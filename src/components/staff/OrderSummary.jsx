import {
  useMemo,
  useState,
} from "react";

import {
  FiShoppingCart,
  FiTrash2,
  FiSend,
} from "react-icons/fi";

import api from "../../api/axios";


export default function OrderSummary({

  table,

  cart,

  setCart,

}){


const [guestName,setGuestName]=useState("");

const [loading,setLoading]=useState(false);






const total = useMemo(()=>{

return cart.reduce(

(sum,item)=>

sum +
Number(item.price) *
Number(item.quantity),

0

);

},[cart]);








const removeItem=(id)=>{


setCart(

cart.filter(
item=>
item.menuId!==id
)

);


};








const placeOrder=async()=>{


if(cart.length===0){

alert("Cart is empty");

return;

}



try{


setLoading(true);



const items = cart.map(item=>(

{

menuId:item.menuId,

quantity:item.quantity

}

));




await api.post(

"/order/create",

{

tableId:table._id,

guestName:

guestName || "Guest",

items,

orderType:"now"

},

{

headers:{

Authorization:

`Bearer ${localStorage.getItem("token")}`

}

}

);




alert(
"Order placed successfully"
);



setCart([]);

setGuestName("");



}
catch(err){

console.log(
"ORDER ERROR",
err
);


alert(
err.response?.data?.message ||
"Failed to place order"
);


}
finally{

setLoading(false);

}


};









return (

<div

className="
mt-8
bg-white/5
border
border-white/10
rounded-3xl
p-6
"

>


<div

className="
flex
items-center
gap-3
mb-6
"

>


<FiShoppingCart

className="
text-orange-400
"

size={25}

/>


<div>


<h2

className="
text-2xl
font-black
"

>

Order Summary

</h2>


<p

className="
text-sm
text-slate-400
"

>

{

table.type==="room"

?

`Room ${table.tableNumber}`

:

`Table ${table.tableNumber}`

}

</p>


</div>


</div>









<input

value={guestName}

onChange={
e=>setGuestName(e.target.value)
}

placeholder="
Guest name (optional)
"

className="
w-full
bg-white/10
rounded-xl
px-4
py-3
mb-5
outline-none
"

/>









<div

className="
space-y-3
"

>


{

cart.length===0

?

<p

className="
text-slate-400
text-center
py-5
"

>

No items added

</p>


:


cart.map(item=>(


<div

key={item.menuId}

className="
flex
justify-between
items-center
bg-black/20
rounded-xl
p-3
"

>


<div>


<p

className="
font-bold
"

>

{item.name}

</p>


<p

className="
text-sm
text-slate-400
"

>

x{item.quantity}

</p>


</div>





<div

className="
flex
items-center
gap-4
"

>


<span

className="
font-bold
"

>

₹

{
item.price *
item.quantity
}

</span>




<button

onClick={()=>removeItem(item.menuId)}

className="
text-red-400
"

>

<FiTrash2/>

</button>


</div>


</div>


))


}


</div>









{/* TOTAL */}


<div

className="
mt-6
border-t
border-white/10
pt-5
flex
justify-between
text-xl
font-black
"

>

<span>
Total
</span>


<span

className="
text-orange-400
"

>

₹{total}

</span>


</div>









<button

disabled={
loading ||
cart.length===0
}

onClick={placeOrder}

className="
mt-6
w-full
bg-orange-500
rounded-xl
py-4
font-black
flex
justify-center
items-center
gap-2
disabled:opacity-50
"

>

<FiSend/>

{

loading

?

"Placing..."

:

"Place Order"

}


</button>





</div>

);


}
