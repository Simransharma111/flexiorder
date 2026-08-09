import { useEffect, useState } from "react";
import api from "../api/axios";

import {
FiPlus,
FiEdit2,
FiTrash2,
FiX
} from "react-icons/fi";


export default function MenuCategoryManager({

hotelId,
onCategoryUpdate

}) {


const [categories,setCategories]=useState([]);

const [name,setName]=useState("");

const [parent,setParent]=useState("");

const [editingId,setEditingId]=useState(null);

const [showForm,setShowForm]=useState(false);

const [loading,setLoading]=useState(false);



useEffect(()=>{

if(hotelId){

fetchCategories();

}

},[hotelId]);




// =============================
// FETCH
// =============================

const fetchCategories=async()=>{

try{

const res=
await api.get(
`/menu/category/${hotelId}`
);


setCategories(
res.data || []
);


if(onCategoryUpdate){

onCategoryUpdate(
res.data || []
);

}


}

catch(err){

console.log(
"Category fetch error",
err
);

}

};




// =============================
// SAVE
// =============================

const saveCategory=async(e)=>{

e.preventDefault();


if(!name.trim())
return;



try{


setLoading(true);



const token=
localStorage.getItem("token");



const data={

name,

hotelId,

parentCategory:
parent || null

};



let res;



if(editingId){


res=
await api.put(

`/menu/category/${editingId}`,

data,

{

headers:{

Authorization:
`Bearer ${token}`

}

}

);


}

else{


res=
await api.post(

"/menu/category",

data,

{

headers:{

Authorization:
`Bearer ${token}`

}

}

);


}



resetForm();

fetchCategories();


}

catch(err){

console.log(err);

alert(

err?.response?.data?.message ||
"Category save failed"

);

}

finally{

setLoading(false);

}


};





// =============================
// EDIT
// =============================

const editCategory=(category)=>{


setEditingId(
category._id
);


setName(
category.name
);


setParent(

category.parentCategory?._id ||
""

);


setShowForm(true);


};





// =============================
// DELETE
// =============================

const deleteCategory=async(id)=>{


const ok=
window.confirm(
"Delete this category?"
);


if(!ok)
return;



try{


const token=
localStorage.getItem("token");



await api.delete(

`/menu/category/${id}`,

{

headers:{

Authorization:
`Bearer ${token}`

}

}

);



fetchCategories();


}

catch(err){

console.log(err);

alert(
"Delete failed"
);

}


};





const resetForm=()=>{


setName("");

setParent("");

setEditingId(null);

setShowForm(false);


};






return (

<div className="
bg-white
border
border-gray-200
rounded-xl
p-5
">


<div className="
flex
justify-between
items-center
mb-5
">


<div>

<h2 className="
font-bold
text-lg
">

Menu Categories

</h2>


<p className="
text-sm
text-gray-500
">

Create your own menu structure

</p>


</div>



<button

onClick={()=>{

resetForm();

setShowForm(true);

}}

className="
bg-orange-500
text-white
px-4
py-2
rounded-lg
flex
items-center
gap-2
font-semibold
"

>

<FiPlus/>

Add Category

</button>


</div>






{
showForm && (

<form

onSubmit={saveCategory}

className="
border
rounded-xl
p-4
mb-5
bg-gray-50
"

>


<div className="
grid
md:grid-cols-2
gap-4
">


<div>

<label className="
text-sm
font-semibold
">

Category Name

</label>


<input

value={name}

onChange={(e)=>
setName(e.target.value)
}

placeholder="
Example: Indian Food
"

className="
w-full
border
rounded-lg
px-3
py-3
mt-1
"

/>

</div>





<div>

<label className="
text-sm
font-semibold
">

Parent Category

</label>



<select

value={parent}

onChange={(e)=>
setParent(e.target.value)
}

className="
w-full
border
rounded-lg
px-3
py-3
mt-1
"

>


<option value="">
Main Category
</option>



{
categories
.filter(
c=>!c.parentCategory
)
.map(category=>(


<option

key={category._id}

value={category._id}

>

{category.name}

</option>


))

}



</select>


</div>


</div>




<div className="
flex
gap-3
mt-4
">


<button

disabled={loading}

className="
bg-orange-500
text-white
px-5
py-2
rounded-lg
font-semibold
"

>

{

loading
?
"Saving..."
:
editingId
?
"Update"
:
"Save"

}

</button>




<button

type="button"

onClick={resetForm}

className="
border
px-5
py-2
rounded-lg
"

>

Cancel

</button>


</div>



</form>

)

}







<div className="
space-y-3
">


{
categories.map(category=>(


<div

key={category._id}

className="
border
rounded-xl
p-4
flex
justify-between
items-center
"

>


<div>


<h3 className="
font-semibold
">

{category.name}

</h3>



{

category.parentCategory && (

<p className="
text-xs
text-gray-500
">

Sub category of:

{
category.parentCategory.name ||
"Category"

}

</p>

)

}



</div>





<div className="
flex
gap-2
">


<button

onClick={()=>
editCategory(category)
}

className="
w-9
h-9
rounded-lg
bg-blue-50
text-blue-600
flex
items-center
justify-center
"

>

<FiEdit2/>

</button>



<button

onClick={()=>
deleteCategory(category._id)
}

className="
w-9
h-9
rounded-lg
bg-red-50
text-red-600
flex
items-center
justify-center
"

>

<FiTrash2/>

</button>


</div>



</div>


))

}


</div>


</div>

);


}