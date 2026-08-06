import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiSearch,
  FiMapPin,
} from "react-icons/fi";

import api from "../api/axios";


export default function StaffOrder({
  hotel,
}) {


const [menu,setMenu]=useState([]);

const [tables,setTables]=useState([]);

const [selectedTable,setSelectedTable]=useState("");

const [guestName,setGuestName]=useState("");

const [cart,setCart]=useState([]);

const [search,setSearch]=useState("");

const [loading,setLoading]=useState(false);




/*
=========================
FETCH MENU
=========================
*/

const fetchMenu=async()=>{

try{


if(!hotel?._id)
return;


const res=await api.get(
`/menu/${hotel._id}`
);


setMenu(
res.data || []
);


}
catch(error){

console.log(
"MENU ERROR",
error.response?.data || error.message
);

}

};





/*
=========================
FETCH TABLES
=========================
*/

const fetchTables=async()=>{

try{


const res=await api.get(
"/table"
);


setTables(
res.data.tables || []
);


}
catch(error){

console.log(
"TABLE ERROR",
error.response?.data || error.message
);

}

};





useEffect(()=>{

if(hotel?._id){

fetchMenu();

fetchTables();

}

},[hotel]);






/*
=========================
FILTER MENU
=========================
*/

const filteredMenu =
useMemo(()=>{


if(!search)
return menu;


return menu.filter(
item=>

item.name
.toLowerCase()
.includes(
search.toLowerCase()
)

);


},[
menu,
search
]);









/*
=========================
ADD ITEM
=========================
*/


const addItem=(dish)=>{


const existing =
cart.find(
item=>item.menuId===dish._id
);


if(existing){

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






/*
=========================
UPDATE QUANTITY
=========================
*/

const changeQty=(id,type)=>{


setCart(

cart.map(item=>{


if(item.menuId!==id)
return item;


let qty =
type==="plus"

?

item.quantity+1

:

item.quantity-1;



return {

...item,

quantity:
qty<1
?
1
:
qty

};


})

);


};







/*
=========================
TOTAL
=========================
*/

const total =

cart.reduce(

(sum,item)=>

sum+
(
item.price *
item.quantity
),

0

);








/*
=========================
PLACE ORDER
=========================
*/


const placeOrder=async()=>{


if(!selectedTable){

alert(
"Select table first"
);

return;

}



if(cart.length===0){

alert(
"Select dishes"
);

return;

}



try{


setLoading(true);



await api.post(
"/orders",
{

tableId:selectedTable,

guestName:
guestName || "Guest",


items:

cart.map(item=>({

menuId:item.menuId,

quantity:item.quantity

}))


}

);



alert(
"Order sent to kitchen"
);



setCart([]);

setGuestName("");



}

catch(error){

console.log(
"ORDER ERROR",
error.response?.data || error.message
);


alert(
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
space-y-6
"
>


{/* HEADER */}


<div>

<h1
className="
text-2xl
font-black
"
>

Staff Ordering

</h1>


<p
className="
opacity-60
"
>

Create order for guest

</p>


</div>








{/* TOP SECTION */}


<div
className="
grid
md:grid-cols-3
gap-4
"
>


{/* TABLE */}


<div
className="
rounded-2xl
border
p-4
"
>


<label
className="
text-sm
font-bold
"
>

Select Table / Room

</label>


<select

value={selectedTable}

onChange={
e=>setSelectedTable(e.target.value)
}

className="
mt-2
w-full
rounded-xl
p-3
bg-transparent
border
"

>


<option value="">

Choose

</option>


{

tables.map(table=>(


<option

key={table._id}

value={table._id}

>

{

table.type==="room"

?

`Room ${table.tableNumber}`

:

`Table ${table.tableNumber}`

}


</option>


))


}


</select>


</div>







{/* GUEST */}


<div
className="
rounded-2xl
border
p-4
"
>


<label
className="
text-sm
font-bold
"
>

Guest Name

</label>


<input

value={guestName}

onChange={
e=>setGuestName(e.target.value)
}

placeholder="Guest"

className="
mt-2
w-full
rounded-xl
p-3
bg-transparent
border
"

/>


</div>







{/* TOTAL */}

<div
className="
rounded-2xl
border
p-4
"
>


<p
className="
text-sm
font-bold
"
>
Total
</p>


<h2
className="
text-3xl
font-black
"
>

₹{total}

</h2>


</div>



</div>










<div
className="
grid
lg:grid-cols-3
gap-6
"
>





{/* MENU */}


<div
className="
lg:col-span-2
"
>


<div
className="
flex
items-center
gap-3
border
rounded-xl
px-4
py-3
mb-4
"
>

<FiSearch/>


<input

className="
bg-transparent
outline-none
w-full
"

placeholder="Search dish"

value={search}

onChange={
e=>setSearch(e.target.value)
}

/>


</div>





<div
className="
grid
sm:grid-cols-2
gap-4
"
>


{

filteredMenu.map(dish=>(


<div

key={dish._id}

className="
border
rounded-2xl
p-4
"

>


<h3
className="
font-bold
"
>

{dish.name}

</h3>


<p
className="
text-sm
opacity-60
"
>

₹{dish.price}

</p>



<button

onClick={()=>
addItem(dish)
}

className="
mt-3
w-full
bg-orange-500
text-white
rounded-xl
py-2
font-bold
"

>

Add

</button>


</div>


))


}


</div>


</div>








{/* CART */}


<div
className="
border
rounded-2xl
p-4
"
>


<div
className="
flex
gap-2
items-center
mb-4
"
>

<FiShoppingCart/>

<h2
className="
font-bold
"
>
Cart
</h2>

</div>





{

cart.length===0

?

<p
className="
opacity-50
"
>
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
border-b
py-3
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


<p>
₹{item.price*item.quantity}
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
changeQty(
item.menuId,
"minus"
)
}

>

<FiMinus/>

</button>


<span>
{item.quantity}
</span>


<button

onClick={()=>
changeQty(
item.menuId,
"plus"
)
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
bg-green-500
text-white
rounded-xl
py-3
font-bold
"

>

{
loading
?
"Sending..."
:
"Place Order"
}

</button>


</div>





</div>



</div>

);


}