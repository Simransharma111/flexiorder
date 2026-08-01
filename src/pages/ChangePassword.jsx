import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";


export default function ChangePassword(){


const navigate = useNavigate();


const [formData,setFormData] = useState({

oldPassword:"",
newPassword:"",
confirmPassword:""

});


const [loading,setLoading] =
useState(false);





const handleChange=(e)=>{


setFormData({

...formData,

[e.target.name]:e.target.value

});


};







const handleSubmit=async(e)=>{


e.preventDefault();


if(
formData.newPassword !==
formData.confirmPassword
){

alert("New passwords do not match");

return;

}



try{


setLoading(true);



await api.post(
"/auth/change-password",
{

oldPassword:
formData.oldPassword,


newPassword:
formData.newPassword


}
);




alert(
"Password changed successfully"
);




// After password change go to hotel setup

navigate(
"/setup-hotel"
);



}
catch(err){


console.log(err);


alert(

err.response?.data?.message ||
"Password change failed"

);


}
finally{


setLoading(false);


}



};








return(


<div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">


<div className="bg-white/10 border border-white/10 p-8 rounded-3xl w-full max-w-md">


<h1 className="text-3xl font-bold">

Change Password

</h1>



<p className="text-gray-400 mt-2">

Change your temporary password before continuing

</p>





<form
onSubmit={handleSubmit}
className="mt-6 space-y-4"
>



<input

type="password"

name="oldPassword"

placeholder="Temporary Password"

value={
formData.oldPassword
}

onChange={handleChange}

className="w-full p-3 rounded-xl bg-white/10"

/>






<input

type="password"

name="newPassword"

placeholder="New Password"

value={
formData.newPassword
}

onChange={handleChange}

className="w-full p-3 rounded-xl bg-white/10"

/>








<input

type="password"

name="confirmPassword"

placeholder="Confirm Password"

value={
formData.confirmPassword
}

onChange={handleChange}

className="w-full p-3 rounded-xl bg-white/10"

/>







<button

disabled={loading}

className="w-full bg-orange-500 hover:bg-orange-600 p-3 rounded-xl font-bold"

>


{
loading
?
"Changing..."
:
"Change Password"
}


</button>



</form>


</div>


</div>


);


}