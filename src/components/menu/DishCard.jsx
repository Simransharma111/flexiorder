import {
  FiEdit2,
  FiTrash2,
  FiImage,
} from "react-icons/fi";


export default function DishCard({
  dish,
  onEdit,
  onDelete,
}) {


return (

<div className="
bg-white
border
border-gray-200
rounded-xl
p-4
hover:shadow-md
transition
">


<div className="
flex
gap-4
">


{/* IMAGE */}

{

dish.image ?

<img
src={dish.image}
alt={dish.name}
className="
w-20
h-20
rounded-xl
object-cover
"
/>

:

<div className="
w-20
h-20
rounded-xl
bg-gray-100
flex
items-center
justify-center
">

<FiImage
className="text-gray-400"
size={24}
/>

</div>

}


{/* DETAILS */}

<div className="
flex-1
">


<div className="
flex
justify-between
gap-2
">

<h3 className="
font-bold
text-gray-800
">

{dish.name}

</h3>


<span className="
font-bold
text-orange-600
">

₹{dish.price}

</span>


</div>


<p className="
text-sm
text-gray-500
mt-1
">

{
dish.category?.name ||
dish.category
}

</p>



<div className="
flex
gap-2
flex-wrap
mt-2
">


<span className={`
px-2
py-1
rounded-md
text-xs
font-semibold

${
dish.foodType==="veg"

?

"bg-green-50 text-green-700"

:

"bg-red-50 text-red-700"

}

`}>

{
dish.foodType==="veg"
?
"🟢 Veg"
:
"🔴 Non Veg"
}

</span>



<span className={`
px-2
py-1
rounded-md
text-xs
font-semibold

${
dish.isAvailable

?

"bg-green-50 text-green-700"

:

"bg-red-50 text-red-700"

}

`}>

{
dish.isAvailable
?
"Available"
:
"Hidden"
}

</span>


</div>


</div>


</div>



{/* TAGS */}

<div className="
flex
flex-wrap
gap-2
mt-4
">


{
dish.tags?.map(tag=>(

<span
key={tag}
className="
bg-gray-100
text-gray-600
px-2
py-1
rounded-md
text-xs
"
>

{tag}

</span>

))
}



{
dish.todaySpecial && (

<span className="
bg-orange-50
text-orange-600
px-2
py-1
rounded-md
text-xs
">

Today's Special

</span>

)
}



{
dish.isBestseller && (

<span className="
bg-yellow-50
text-yellow-700
px-2
py-1
rounded-md
text-xs
">

Best Seller

</span>

)
}



{
dish.chefChoice && (

<span className="
bg-purple-50
text-purple-700
px-2
py-1
rounded-md
text-xs
">

Chef Choice

</span>

)
}



</div>



{/* ACTIONS */}

<div className="
flex
gap-2
mt-4
">


<button

onClick={()=>onEdit(dish)}

className="
flex-1
bg-blue-50
text-blue-600
py-2
rounded-lg
font-semibold
text-sm
flex
items-center
justify-center
gap-2
hover:bg-blue-100
"

>

<FiEdit2 size={15}/>

Edit

</button>



<button

onClick={()=>onDelete(dish._id)}

className="
flex-1
bg-red-50
text-red-600
py-2
rounded-lg
font-semibold
text-sm
flex
items-center
justify-center
gap-2
hover:bg-red-100
"

>

<FiTrash2 size={15}/>

Delete

</button>


</div>



</div>

);

}