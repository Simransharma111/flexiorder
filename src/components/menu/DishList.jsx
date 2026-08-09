import { FiImage } from "react-icons/fi";
import DishCard from "./DishCard";


export default function DishList({

dishes,
onEdit,
onDelete

}) {



if(!dishes || dishes.length===0){

return (

<div className="
bg-white
border
border-gray-200
rounded-xl
p-12
text-center
">


<div className="
w-16
h-16
rounded-full
bg-gray-100
flex
items-center
justify-center
mx-auto
mb-4
">

<FiImage
size={26}
className="text-gray-400"
/>

</div>


<h3 className="
font-bold
text-lg
">

No dishes found

</h3>


<p className="
text-sm
text-gray-500
mt-1
">

Add dishes to your menu

</p>


</div>

);

}




return (

<div className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-3
gap-4
">


{

dishes.map((dish)=>(


<DishCard

key={dish._id}

dish={dish}

onEdit={onEdit}

onDelete={onDelete}

/>


))

}


</div>

);


}