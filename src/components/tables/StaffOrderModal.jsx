import React, {
  useEffect,
  useState,
} from "react";

import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiX,
} from "react-icons/fi";

import api from "../../api/axios";


export default function StaffOrderModal({

table,
close,

}){


const [menu,setMenu]=useState([]);

const [cart,setCart]=useState([]);

const [search,setSearch]=useState("");

const [loading,setLoading]=useState(false);






useEffect(()=>{

fetchMenu();

},[]);





const fetchMenu = async()=>{

try{

const res =
await api.get(
`/menu/${table.hotelId}`
);


setMenu(
res.data || []
);


}
catch(err){

console.log(err);

}

};








const addItem=(dish)=>{


const exists =
cart.find(
item=>item.menuId===dish._id
);


if(exists){


setCart(

cart.map(item=>

item.menuId===dish._id

?

{
...item,
quantity:item.quantity+1
}

:

item

)

);


}

else{


setCart([

...cart,

{

menuId:dish._id,

name:dish.name,

price:dish.price,

quantity:1

}

]);


}


};







const decrease=(id)=>{


setCart(

cart

.map(item=>

item.menuId===id

?

{
...item,
quantity:item.quantity-1
}

:

item

)

.filter(
item=>item.quantity>0
)


);


};









const placeOrder=async()=>{


if(cart.length===0)
return;


try{


setLoading(true);


await api.post(

"/orders",

{

tableId:table._id,

guestName:"Guest",

items:cart,

orderType:"now"

}

);



close();


}

catch(err){

console.log(err);

}

finally{

setLoading(false);

}


};









const filteredMenu=

menu.filter(d=>

d.name
.toLowerCase()
.includes(
search.toLowerCase()
)

);







return (

<div

className="
fixed
inset-0
bg-black/70
z-50
flex
items-center
justify-center
p-4
"

>


<div

className="
bg-slate-950
text-white
w-full
max-w-5xl
rounded-3xl
p-5
grid
md:grid-cols-3
gap-5
max-h-[90vh]
overflow-hidden
"

>






{/* MENU */}

<div

className="
md:col-span-2
overflow-y-auto
"

>


<div

className="
flex
justify-between
items-center
mb-4
"

>


<h2
className="
text-2xl
font-black
"

>

Order for

{" "}

{

table.type==="room"

?

`Room ${table.tableNumber}`

:

`Table ${table.tableNumber}`

}


</h2>


<button

onClick={close}

>

<FiX size={22}/>

</button>


</div>







<div

className="
flex
items-center
gap-2
bg-white/10
rounded-xl
px-3
mb-4
"

>

<FiSearch/>

<input

className="
bg-transparent
outline-none
p-3
w-full
"

placeholder="Search dish..."

value={search}

onChange={
e=>setSearch(e.target.value)
}

/>

</div>








<div

className="
grid
grid-cols-2
lg:grid-cols-3
gap-3
"

>


{

filteredMenu.map(dish=>(


<button

key={dish._id}

onClick={()=>addItem(dish)}

className="
bg-white/5
rounded-2xl
p-3
text-left
hover:bg-white/10
"

>


<p

className="
font-bold
"

>

{dish.name}

</p>


<p

className="
text-orange-400
text-sm
"

>

₹{dish.price}

</p>


</button>


))

}


</div>


</div>









{/* CART */}

<div

className="
bg-white/5
rounded-2xl
p-4
"

>


<div

className="
flex
items-center
gap-2
mb-4
"

>

<FiShoppingCart/>

<h3

className="
font-bold
text-lg
"

>

Cart

</h3>


</div>








{

cart.length===0

?

<p className="text-slate-400">

No items

</p>


:

cart.map(item=>(


<div

key={item.menuId}

className="
flex
justify-between
items-center
mb-3
"

>


<div>

<p className="text-sm font-bold">

{item.name}

</p>


<p className="text-xs text-slate-400">

₹{item.price}

</p>

</div>



<div

className="
flex
items-center
gap-2
"

>


<button

onClick={()=>
decrease(item.menuId)
}

>

<FiMinus/>

</button>


<span>

{item.quantity}

</span>


<button

onClick={()=>
addItem(item)
}

>

<FiPlus/>

</button>


</div>


</div>


))


}







<button

onClick={placeOrder}

disabled={loading}

className="
mt-5
w-full
bg-orange-500
py-3
rounded-xl
font-bold
"

>

{

loading

?

"Placing..."

:

"Place Order"

}


</button>



</div>





</div>


</div>


);


}