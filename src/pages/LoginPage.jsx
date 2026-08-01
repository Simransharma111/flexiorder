import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { initFCM } from "../utils/fcmPush";


export default function LoginPage() {


  const navigate = useNavigate();

  const { login } = useAuth();



  const [formData, setFormData] = useState({

    email:"",
    password:""

  });



  const [loading,setLoading] = useState(false);





  const handleChange = (e)=>{

    setFormData({

      ...formData,

      [e.target.name]:e.target.value

    });

  };







  const handleSubmit = async(e)=>{


    e.preventDefault();


    try{


      setLoading(true);



      const res =
      await api.post(
        "/auth/login",
        formData
      );



      console.log(
        "LOGIN RESPONSE",
        res.data
      );





      /*
      ======================================
      SAVE LOGIN DATA
      ======================================
      */


      localStorage.setItem(
        "token",
        res.data.token
      );


      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );


      localStorage.setItem(
        "role",
        res.data.user.role
      );



      login(
        res.data.user,
        res.data.token
      );







      /*
      ======================================
      FIRST LOGIN PASSWORD CHANGE
      ======================================
      */


      if(
        res.data.mustChangePassword
      ){

        navigate(
          "/change-password"
        );

        return;

      }






      /*
      ======================================
      OWNER HOTEL SETUP
      ======================================
      */


      if(
        res.data.user.role==="owner" &&
        !res.data.hotelSetupCompleted
      ){

        navigate(
          "/setup-hotel"
        );

        return;

      }







      /*
      ======================================
      INIT NOTIFICATION
      AFTER ACCOUNT READY
      ======================================
      */


      await initFCM(api);







      /*
      ======================================
      ROLE BASED DASHBOARD
      ======================================
      */


      switch(
        res.data.user.role
      ){


        case "superadmin":

          navigate(
            "/superadmin"
          );

          break;



        case "owner":

          navigate(
            "/owner/dashboard"
          );

          break;



        case "staff":

          navigate(
            "/kitchen"
          );

          break;



        default:

          navigate(
            "/"
          );

      }





    }
    catch(err){


      console.log(
        "LOGIN ERROR",
        err
      );



      alert(

        err.response?.data?.message ||
        "Login failed"

      );


    }
    finally{


      setLoading(false);


    }


  };



  return (


    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-4">


      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">



        <h1 className="text-4xl font-bold text-center">

          FlexiOrder

        </h1>




        <p className="text-gray-400 text-center mt-3">

          Login to continue

        </p>






        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >





          <div>


            <label className="block mb-2">

              Email

            </label>


            <input

              type="email"

              name="email"

              value={formData.email}

              onChange={handleChange}

              required

              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"

            />


          </div>







          <div>


            <label className="block mb-2">

              Password

            </label>


            <input

              type="password"

              name="password"

              value={formData.password}

              onChange={handleChange}

              required

              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"

            />


          </div>







          <button

            type="submit"

            disabled={loading}

            className="w-full bg-orange-500 hover:bg-orange-600 rounded-2xl py-4 font-bold text-lg"

          >

            {
              loading
              ?
              "Logging in..."
              :
              "Login"
            }


          </button>




        </form>



      </div>


    </div>


  );


}