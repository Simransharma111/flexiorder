import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  FiArrowRight,
  FiCheckCircle,
  FiGrid,
  FiSmartphone,
  FiUsers,
} from "react-icons/fi";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { initFCM } from "../utils/fcmPush";
import { getPostLoginPath } from "../constants/roles";
import { normalizeRole } from "../utils/access";


export default function AuthPage({ mode = "login" }) {


  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();


  const isRegister = mode === "register";



  const [loading, setLoading] = useState(false);



  const [formData, setFormData] = useState({

    name: "",
    email: "",
    password: "",
    confirmPassword: ""

  });





  useEffect(() => {

    document.title =
      isRegister
        ?
        "Create Account | FlexiOrder"
        :
        "Login | FlexiOrder";


  }, [isRegister]);







  const handleChange = (e) => {

    setFormData({

      ...formData,

      [e.target.name]: e.target.value

    });


  };







  const handleSubmit = async (e) => {


    e.preventDefault();



    if (
      isRegister &&
      formData.password !== formData.confirmPassword
    ) {

      alert("Passwords do not match");

      return;

    }



    try {


      setLoading(true);



      const endpoint =
        isRegister
          ?
          "/auth/register"
          :
          "/auth/login";




      const payload =
        isRegister
          ?
          {
            name: formData.name,
            email: formData.email,
            password: formData.password
          }
          :
          {
            email: formData.email,
            password: formData.password
          };





      const res =
        await api.post(
          endpoint,
          payload,
          { skipAuth: true }
        );




      login(
        res.data.user,
        res.data.token
      );





      if (isRegister) {


        navigate("/setup-hotel");

        return;


      }





      if (res.data.mustChangePassword) {

        navigate("/change-password");

        return;

      }





      if (
        normalizeRole(res.data.user.role) === "owner" &&
        !res.data.hotelSetupCompleted
      ) {

        navigate("/setup-hotel");

        return;

      }





      await initFCM(api);







      navigate(
        getPostLoginPath(res.data.user.role, location.state?.from),
        { replace: true }
      );



    }
    catch (err) {


      const message =
        err.response?.data?.message ||
        (!err.response && err.request
          ? "Unable to reach FlexiOrder. Check your internet and try again."
          : "Something went wrong");


      alert(

        message

      );


    }
    finally {


      setLoading(false);


    }



  };







  return (


    <div className="
min-h-screen
bg-slate-950
text-white
flex
items-center
justify-center
px-6
py-10
relative
overflow-hidden
">



      {/* Background */}

      <div className="
absolute
top-0
left-0
h-[500px]
w-[500px]
rounded-full
bg-blue-600/20
blur-[150px]
"/>


      <div className="
absolute
bottom-0
right-0
h-[500px]
w-[500px]
rounded-full
bg-cyan-500/20
blur-[150px]
"/>






      <div className="
relative
grid
max-w-6xl
w-full
gap-10
lg:grid-cols-2
items-center
">





        {/* LEFT BRAND AREA */}



        <div className="hidden lg:block">


          <div className="
inline-flex
items-center
gap-2
rounded-full
border
border-blue-500/30
bg-blue-500/10
px-4
py-2
text-blue-300
">

            <FiCheckCircle />

            Trusted by modern restaurants

          </div>





          <h1 className="
mt-8
text-6xl
font-black
leading-tight
">


            Run Your


            <span className="
block
bg-gradient-to-r
from-blue-400
to-cyan-400
bg-clip-text
text-transparent
">

              Restaurant Smarter

            </span>


          </h1>






          <p className="
mt-6
text-lg
text-slate-400
max-w-xl
">

            FlexiOrder connects QR ordering,
            waiter ordering, kitchen display,
            staff management and analytics
            into one powerful platform.

          </p>





          <div className="
mt-10
grid
grid-cols-3
gap-4
">


            <div className="
rounded-2xl
bg-white/5
border
border-white/10
p-5
">

              <FiSmartphone className="text-blue-400 text-2xl" />

              <p className="mt-3 font-semibold">
                QR Orders
              </p>

            </div>




            <div className="
rounded-2xl
bg-white/5
border
border-white/10
p-5
">

              <FiUsers className="text-cyan-400 text-2xl" />

              <p className="mt-3 font-semibold">
                Staff
              </p>

            </div>




            <div className="
rounded-2xl
bg-white/5
border
border-white/10
p-5
">

              <FiGrid className="text-indigo-400 text-2xl" />

              <p className="mt-3 font-semibold">
                Kitchen
              </p>

            </div>



          </div>




        </div>







        {/* AUTH CARD */}



        <div className="
rounded-[32px]
border
border-white/10
bg-white/5
backdrop-blur-xl
p-8
shadow-2xl
">





<div className="
flex
justify-center
">

  <div className="
  h-20
  w-20
  rounded-3xl
  overflow-hidden
  bg-white
  shadow-xl
  ">

    <img
      src="/logo.jpg"
      alt="FlexiOrder Logo"
      className="
      h-full
      w-full
      object-contain
      "
    />

  </div>

</div>




          <h2 className="
mt-6
text-center
text-3xl
font-bold
">

            FlexiOrder

          </h2>



          <p className="
text-center
mt-2
text-slate-400
">

            {
              isRegister
                ?
                "Start your free trial today"
                :
                "Welcome back to your dashboard"
            }

          </p>







          <div className="
mt-8
flex
rounded-2xl
bg-black/20
p-1
">


            <Link

              to="/login"

              className={`
flex-1
rounded-xl
py-3
text-center
font-semibold
${!isRegister
                  ?
                  "bg-blue-600"
                  :
                  "text-slate-400"}
`}

            >

              Login

            </Link>



            <Link

              to="/register"

              className={`
flex-1
rounded-xl
py-3
text-center
font-semibold
${isRegister
                  ?
                  "bg-blue-600"
                  :
                  "text-slate-400"}
`}

            >

              Register

            </Link>


          </div>








          <form
            onSubmit={handleSubmit}
            className="
mt-8
space-y-5
"
          >





            {
              isRegister &&

              <input

                name="name"

                placeholder="Owner Name"

                value={formData.name}

                onChange={handleChange}

                className="
w-full
rounded-2xl
bg-slate-900/70
border
border-white/10
px-5
py-4
outline-none
focus:border-blue-500
"

              />

            }






            <input

              name="email"

              type="email"

              placeholder="Email Address"

              value={formData.email}

              onChange={handleChange}

              className="
w-full
rounded-2xl
bg-slate-900/70
border
border-white/10
px-5
py-4
outline-none
focus:border-blue-500
"

            />






            <input

              name="password"

              type="password"

              placeholder="Password"

              value={formData.password}

              onChange={handleChange}

              className="
w-full
rounded-2xl
bg-slate-900/70
border
border-white/10
px-5
py-4
outline-none
focus:border-blue-500
"

            />





            {
              isRegister &&

              <input

                name="confirmPassword"

                type="password"

                placeholder="Confirm Password"

                value={formData.confirmPassword}

                onChange={handleChange}

                className="
w-full
rounded-2xl
bg-slate-900/70
border
border-white/10
px-5
py-4
outline-none
focus:border-blue-500
"

              />

            }





            <button

              disabled={loading}

              className="
w-full
rounded-2xl
bg-blue-600
py-4
font-bold
text-lg
hover:bg-blue-700
transition
flex
items-center
justify-center
gap-2
"

            >


              {
                loading
                  ?
                  "Please wait..."
                  :
                  isRegister
                    ?
                    <>
                      Start Free Trial
                      <FiArrowRight />
                    </>
                    :
                    "Login"

              }



            </button>





          </form>






        </div>






      </div>



    </div>



  );


}
