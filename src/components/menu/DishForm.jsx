import { useEffect, useState } from "react";
import api from "../../api/axios";

import { FiX, FiImage } from "react-icons/fi";


export default function DishForm({

hotelId,
categories=[],
editingDish,
onSaved,
onCancel

}){


const [loading,setLoading]=useState(false);

const [imageFile,setImageFile]=useState(null);

const [subCategories,setSubCategories]=useState([]);



const initialState={

name:"",

description:"",

category:"",

subcategory:"",

foodType:"veg",

price:"",

prepTime:"",

isAvailable:true,

isRecommended:false,

isBestseller:false,

featured:false,

todaySpecial:false,

isPopular:false,

isNewArrival:false,

chefChoice:false,

spiceLevel:"",

tags:[],

displayOrder:0

};



const [formData,setFormData]=useState(initialState);



// =============================
// LOAD EDIT DATA
// =============================

useEffect(()=>{


if(editingDish){


const categoryId =
editingDish.category?._id ||
editingDish.category ||
"";


const category =
categories.find(
item=>item._id===categoryId
);



setSubCategories(
category?.subcategories || []
);



setFormData({

name:editingDish.name || "",

description:
editingDish.description || "",

category:categoryId,

subcategory:
editingDish.subcategory || "",

foodType:
editingDish.foodType || "veg",

price:
editingDish.price || "",

prepTime:
editingDish.prepTime || "",

isAvailable:
editingDish.isAvailable ?? true,

isRecommended:
editingDish.isRecommended ?? false,

isBestseller:
editingDish.isBestseller ?? false,

featured:
editingDish.featured ?? false,

todaySpecial:
editingDish.todaySpecial ?? false,

isPopular:
editingDish.isPopular ?? false,

isNewArrival:
editingDish.isNewArrival ?? false,

chefChoice:
editingDish.chefChoice ?? false,

spiceLevel:
editingDish.spiceLevel || "",

tags:
editingDish.tags || [],

displayOrder:
editingDish.displayOrder || 0

});


}


},[editingDish,categories]);





// =============================
// INPUT
// =============================


const handleChange=(e)=>{


const {
name,
value
}=e.target;



setFormData(prev=>({

...prev,

[name]:value

}));

};





// =============================
// CATEGORY CHANGE
// =============================


const changeCategory=(e)=>{


const id=e.target.value;



const selected =
categories.find(
cat=>cat._id===id
);



setSubCategories(
selected?.subcategories || []
);



setFormData(prev=>({

...prev,

category:id,

subcategory:""

}));

};





// =============================
// CHECKBOX
// =============================


const toggle=(name)=>{


setFormData(prev=>({

...prev,

[name]:!prev[name]

}));

};





// =============================
// SAVE
// =============================


const handleSubmit=async(e)=>{


e.preventDefault();


try{


setLoading(true);



const form =
new FormData();



Object.entries(formData)
.forEach(([key,value])=>{


if(key==="tags"){

form.append(
key,
value.join(",")
);

}

else{

form.append(
key,
value
);

}


});



if(imageFile){

form.append(
"image",
imageFile
);

}




const token =
localStorage.getItem("token");



const config={

headers:{

Authorization:
`Bearer ${token}`,

"Content-Type":
"multipart/form-data"

}

};



if(editingDish){


await api.put(

`/menu/dish/${editingDish._id}`,

form,

config

);


}
else{


await api.post(

"/menu/dish",

{
...Object.fromEntries(form),
hotelId
},

config

);


}



alert(
"Dish saved successfully"
);



onSaved();



}

catch(err){

console.log(err);


alert(

err?.response?.data?.message ||

"Save failed"

);

}

finally{

setLoading(false);

}


};






return (

<div className="
bg-white
border
rounded-2xl
p-6
">


<div className="
flex
justify-between
mb-5
">


<h2 className="
text-lg
font-bold
">

{
editingDish
?
"Edit Dish"
:
"Add Dish"

}

</h2>


<button
onClick={onCancel}
>

<FiX/>

</button>


</div>





<form
onSubmit={handleSubmit}
className="space-y-5"
>



<div className="
grid
md:grid-cols-2
gap-4
">


<input

name="name"

value={formData.name}

onChange={handleChange}

placeholder="Dish name"

required

className="
border
rounded-lg
px-3
py-3
"

/>



<input

type="number"

name="price"

value={formData.price}

onChange={handleChange}

placeholder="Price"

required

className="
border
rounded-lg
px-3
py-3
"

/>



</div>





<select

value={formData.category}

onChange={changeCategory}

className="
w-full
border
rounded-lg
px-3
py-3
"

required

>

<option value="">

Select Category

</option>


{
categories.map(cat=>(

<option

key={cat._id}

value={cat._id}

>

{cat.name}

</option>

))

}


</select>





{
subCategories.length>0 &&

<select

name="subcategory"

value={formData.subcategory}

onChange={handleChange}

className="
w-full
border
rounded-lg
px-3
py-3
"

>

<option value="">

Select Subcategory

</option>


{
subCategories.map(sub=>(

<option

key={sub}

value={sub}

>

{sub}

</option>

))

}


</select>

}





<textarea

name="description"

value={formData.description}

onChange={handleChange}

placeholder="Description"

rows="3"

className="
w-full
border
rounded-lg
px-3
py-3
"

/>





<input

type="number"

name="prepTime"

value={formData.prepTime}

onChange={handleChange}

placeholder="Preparation time minutes"

className="
w-full
border
rounded-lg
px-3
py-3
"

/>





<div>

<p className="font-semibold mb-2">

Food Type

</p>


<button

type="button"

onClick={()=>setFormData(prev=>({

...prev,
foodType:"veg"

}))}

className="
mr-3
px-4
py-2
rounded-lg
border
"

>

🟢 Veg

</button>



<button

type="button"

onClick={()=>setFormData(prev=>({

...prev,
foodType:"nonveg"

}))}

className="
px-4
py-2
rounded-lg
border
"

>

🔴 Non Veg

</button>


</div>






<label className="
border-dashed
border-2
rounded-xl
p-5
flex
gap-3
items-center
cursor-pointer
">


<FiImage/>


Choose Dish Image


<input

type="file"

accept="image/*"

hidden

onChange={(e)=>

setImageFile(
e.target.files[0]
)

}

/>


</label>





<div className="space-y-2">


{
[

["isAvailable","Available"],

["featured","Featured"],

["todaySpecial","Today's Special"],

["isRecommended","Recommended"],

["isBestseller","Best Seller"],

["chefChoice","Chef Choice"]

].map(item=>(


<label
key={item[0]}
className="
flex
gap-2
items-center
"
>

<input

type="checkbox"

checked={
formData[item[0]]
}

onChange={()=>toggle(item[0])}

/>


{item[1]}


</label>


))

}


</div>





<button

disabled={loading}

className="
w-full
bg-orange-500
text-white
py-3
rounded-xl
font-bold
"

>

{
loading
?
"Saving..."
:
editingDish
?
"Update Dish"
:
"Add Dish"

}


</button>




</form>


</div>

);


}