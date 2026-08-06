import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import {
  FiExternalLink,
  FiRefreshCw,
  FiTrash2,
  FiPlus,
  FiMoreVertical,
  FiGrid,
  FiHome,
} from "react-icons/fi";

import api from "../api/axios";


export default function TableQRManager(){

const [tableName,setTableName]=useState("");

const [tables,setTables]=useState([]);

const [type,setType]=useState("table");

const [loading,setLoading]=useState(false);

const [qrInputs,setQrInputs]=useState({});

const [openMenu,setOpenMenu]=useState(null);

const [showReassign,setShowReassign]=useState({});





/*
========================
FETCH TABLES
========================
*/

const fetchTables=async()=>{

try{

const res=await api.get(
"/table",
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);


setTables(
res.data.tables || []
);


}
catch(err){

console.log(
"TABLE FETCH ERROR",
err
);

}

};




useEffect(()=>{

fetchTables();

},[]);






/*
========================
CREATE TABLE
========================
*/

const createTable=async()=>{


if(!tableName.trim())
return;


try{


setLoading(true);


await api.post(
"/table",
{
tableNumber:tableName,
type
},
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);



setTableName("");

fetchTables();



}
catch(err){

console.log(err);

}
finally{

setLoading(false);

}


};






/*
========================
ASSIGN QR
========================
*/


const assignQR=async(tableId)=>{


const qrId =
qrInputs[tableId];


if(!qrId?.trim()){

alert("Enter QR ID");

return;

}



try{


await api.put(
"/table/assign-qr",
{
tableId,
qrId:qrId.trim()
},
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);



setQrInputs({

...qrInputs,

[tableId]:""

});



setShowReassign({

...showReassign,

[tableId]:false

});



fetchTables();


}
catch(err){

console.log(err);

}


};







/*
========================
REMOVE QR
========================
*/


const removeQR=async(tableId)=>{


try{


await api.put(
"/qr/remove-qr",
{
tableId
},
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);



setOpenMenu(null);


fetchTables();


}
catch(err){

console.log(err);

}


};









return (

<div

className="
min-h-screen
bg-slate-950
text-white
p-4
md:p-6
"

>


{/* HEADER */}


<div

className="
mb-8
rounded-3xl
bg-white/5
border
border-white/10
p-5
"

>


<h1

className="
text-2xl
font-black
mb-4
"

>

QR Tables Management

</h1>



<div

className="
flex
flex-col
md:flex-row
gap-3
"

>



<select

value={type}

onChange={
e=>setType(e.target.value)
}

className="
bg-white/10
rounded-xl
px-4
py-3
outline-none
"

>

<option value="table">
Table
</option>

<option value="room">
Room
</option>


</select>





<input

value={tableName}

onChange={
e=>setTableName(e.target.value)
}

placeholder={
type==="room"
?
"Room 101"
:
"Table A1"
}

className="
flex-1
bg-white/10
rounded-xl
px-4
py-3
outline-none
"

/>





<button

onClick={createTable}

className="
bg-orange-500
rounded-xl
px-6
py-3
font-bold
flex
items-center
justify-center
gap-2
"

>

<FiPlus/>

{
loading
?
"Creating..."
:
"Create"
}

</button>


</div>


</div>







{/* TABLE GRID */}


<div

className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-3
gap-5
"

>


{
tables.map(table=>(


<div

key={table._id}

className="
relative
rounded-3xl
bg-white/5
border
border-white/10
p-5
hover:border-orange-500/40
transition
"

>



{/* TOP */}


<div

className="
flex
justify-between
items-start
"

>


<div>


<div

className="
flex
items-center
gap-2
text-orange-400
text-xs
font-bold
uppercase
"

>

{
table.type==="room"
?
<FiHome/>
:
<FiGrid/>
}


{table.type}

</div>



<h2

className="
text-xl
font-black
mt-2
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





{/* THREE DOT */}


<div

className="
relative
"

>


<button

onClick={()=>setOpenMenu(
openMenu===table._id
?
null
:
table._id
)}

className="
p-2
rounded-xl
hover:bg-white/10
"

>

<FiMoreVertical/>

</button>



{
openMenu===table._id &&

<div

className="
absolute
right-0
top-10
w-40
bg-slate-900
border
border-white/10
rounded-xl
shadow-xl
z-20
overflow-hidden
"

>


<button

onClick={()=>{

setShowReassign({

...showReassign,

[table._id]:
!showReassign[table._id]

});

setOpenMenu(null);

}}

className="
w-full
px-4
py-3
text-left
hover:bg-white/10
flex
gap-2
items-center
"

>

<FiRefreshCw/>

Reassign

</button>


<button

onClick={()=>removeQR(table._id)}

className="
w-full
px-4
py-3
text-left
hover:bg-red-500/20
text-red-400
flex
gap-2
items-center
"

>

<FiTrash2/>

Remove QR

</button>


</div>

}



</div>



</div>
{/* QR DISPLAY */}

<div

className="
mt-5
bg-white
rounded-2xl
p-3
flex
justify-center
"

>


{

table.qrId

?

<QRCodeCanvas

value={
`${import.meta.env.VITE_FRONTEND_URL}/qr/${table.qrId}`
}

size={120}

/>

:

<div

className="
h-[120px]
flex
items-center
justify-center
text-black
text-sm
"

>

No QR

</div>

}


</div>






{/* STATUS */}


<div

className="
mt-4
flex
justify-between
items-center
"

>


<p

className="
text-xs
text-slate-400
truncate
max-w-[180px]
"

>

QR:

{
table.qrId || "Not Assigned"
}


</p>



<div

className="
bg-green-500/20
text-green-400
px-3
py-1
rounded-full
text-xs
font-bold
"

>

Active

</div>


</div>







{/* OPEN MENU */}


{
table.qrId &&


<a

href={
`${window.location.origin}/qr/${table.qrId}`
}

target="_blank"

rel="noreferrer"

className="
mt-5
w-full
flex
items-center
justify-center
gap-2
bg-orange-500
rounded-xl
py-3
font-bold
"

>

<FiExternalLink/>

Open Menu

</a>


}








{/* REASSIGN AREA */}



{
showReassign[table._id] &&


<div

className="
mt-4
space-y-3
"

>


<input

value={
qrInputs[table._id] || ""
}

onChange={
e=>

setQrInputs({

...qrInputs,

[table._id]:
e.target.value

})

}

placeholder="Enter new QR ID"

className="
w-full
bg-white/10
rounded-xl
px-4
py-3
outline-none
"

/>





<button

onClick={()=>
assignQR(table._id)
}

className="
w-full
bg-blue-500
rounded-xl
py-3
font-bold
"

>

Confirm Reassign

</button>


</div>


}







{/* ASSIGN FIRST QR */}



{

!table.qrId &&


<div

className="
mt-4
space-y-3
"

>


<input

value={
qrInputs[table._id] || ""
}

onChange={
e=>

setQrInputs({

...qrInputs,

[table._id]:
e.target.value

})

}

placeholder="Enter QR ID"

className="
w-full
bg-white/10
rounded-xl
px-4
py-3
outline-none
"

/>





<button

onClick={()=>
assignQR(table._id)
}

className="
w-full
bg-green-500
rounded-xl
py-3
font-bold
"

>

Assign QR

</button>


</div>


}



</div>


))

}



</div>



</div>


);


}