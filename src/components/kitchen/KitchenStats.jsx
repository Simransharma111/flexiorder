import {
  FiClock,
  FiCheckCircle,
  FiClipboard
} from "react-icons/fi";


export default function KitchenStats({

newCount,

preparingCount,

readyCount

}){


return (

<div

className="
p-4
sm:p-6
grid
grid-cols-1
sm:grid-cols-3
gap-4
"

>






{/* NEW ORDERS */}

<StatCard

title="New Orders"

count={newCount}

icon={<FiClipboard/>}

color="orange"

/>








{/* PREPARING */}

<StatCard

title="Preparing"

count={preparingCount}

icon={<FiClock/>}

color="blue"

/>









{/* READY */}

<StatCard

title="Ready"

count={readyCount}

icon={<FiCheckCircle/>}

color="green"

/>







</div>

);


}










function StatCard({

title,

count,

icon,

color

}){



const styles={


orange:
"bg-orange-50 text-orange-600 border-orange-200",


blue:
"bg-blue-50 text-blue-600 border-blue-200",


green:
"bg-green-50 text-green-600 border-green-200"


};




return (

<div

className={`
bg-white
rounded-2xl
border
p-5
flex
items-center
justify-between
shadow-sm
hover:shadow-md
transition
`

}

>




<div>


<p

className="
text-sm
text-gray-500
font-semibold
"

>

{title}

</p>



<h2

className="
text-3xl
font-black
mt-1
"

>

{count}

</h2>


</div>





<div

className={`
w-12
h-12
rounded-xl
flex
items-center
justify-center
text-xl
border

${styles[color]}

`}

>


{icon}


</div>







</div>

);


}