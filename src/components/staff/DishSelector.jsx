import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiSearch,
  FiPlus,
  FiMinus,
} from "react-icons/fi";

import api from "../../api/axios";


export default function DishSelector({

table,

cart,

setCart,

}){


const [menu,setMenu]=useState([]);

const [loading,setLoading]=useState(false);

const [search,setSearch]=useState("");







const fetchMenu=useCallback(async()=>{


try{


setLoading(true);


const res =
await api.get(
`/menu/table/${table._id}`
);


setMenu(
res.data.dishes || []
);


}
catch(err){

console.log(
"MENU FETCH ERROR",
err
);

}
finally{

setLoading(false);

}


},[table]);








useEffect(()=>{


if(table){

fetchMenu();

}


},[fetchMenu,table]);









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









const removeItem=(id)=>{


setCart(

cart.map(item=>

item.menuId===id

?

{
...item,
quantity:
Math.max(
1,
item.quantity-1
)
}

:

item

)


);



};









const filteredMenu =

menu.filter(dish=>

dish.name
.toLowerCase()
.includes(
search.toLowerCase()
)

);









return (

<div

className="
mt-8
"

>



{/* HEADER */}


<div

className="
flex
justify-between
items-center
mb-5
"

>


<div>


<h2

className="
text-2xl
font-black
"

>

Select Dishes

</h2>


<p

className="
text-sm
text-slate-400
"

>

Add items for guest

</p>


</div>



<div

className="
bg-orange-500/20
px-4
py-2
rounded-xl
"

>

Cart:
{cart.length}

</div>


</div>









{/* SEARCH */}


<div

className="
flex
items-center
gap-3
bg-white/10
rounded-xl
px-4
py-3
mb-6
"

>


<FiSearch/>


<input

value={search}

onChange={
e=>setSearch(e.target.value)
}

placeholder="
Search dish
"

className="
bg-transparent
outline-none
w-full
"

/>


</div>









{

loading

?

<p>
Loading menu...
</p>


:


<div

className="
grid
grid-cols-1
md:grid-cols-3
gap-4
"

>


{

filteredMenu.map(dish=>(


<div

key={dish._id}

className="
bg-white/5
border
border-white/10
rounded-2xl
p-4
"

>



<div

className="
flex
justify-between
"

>


<div>


<h3

className="
font-bold
"

>

{dish.name}

</h3>


<p

className="
text-orange-400
font-bold
"

>

₹
{dish.price}

</p>


</div>



</div>







<div

className="
mt-4
flex
items-center
justify-between
"

>


<button

onClick={()=>removeItem(dish._id)}

className="
bg-white/10
p-2
rounded-lg
"

>

<FiMinus/>

</button>





<span

className="
font-bold
"

>

{

cart.find(
item=>
item.menuId===dish._id
)
?.quantity || 0

}

</span>





<button

onClick={()=>addItem(dish)}

className="
bg-orange-500
p-2
rounded-lg
"

>

<FiPlus/>

</button>



</div>







</div>


))


}


</div>


}



</div>

);


}
