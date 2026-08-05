import {
  FiClipboard
} from "react-icons/fi";


export default function EmptyOrders(){


return (

<div

className="
py-12
flex
flex-col
items-center
justify-center
text-center
text-gray-400
"

>


<div

className="
w-14
h-14
rounded-full
bg-gray-100
flex
items-center
justify-center
mb-3
"

>

<FiClipboard size={26}/>

</div>





<p

className="
font-bold
text-gray-500
"

>

No Orders

</p>



<p

className="
text-sm
mt-1
"

>

Waiting for incoming orders...

</p>




</div>

);


}