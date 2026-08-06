import {
  FiPlus,
  FiMinus,
  FiClock
} from "react-icons/fi";


export default function DishCard({
  dish,
  quantity,
  onAdd,
  onDecrease,
  onIncrease,
}) {


  const isAvailable =
    dish.isAvailable !== false;


  return (

    <div
      className="
      bg-white
      rounded-3xl
      overflow-hidden
      border
      border-gray-100
      shadow-sm
      transition
      hover:shadow-lg
      "
    >


      {/* IMAGE */}

      <div className="relative">


        {
          dish.image ? (

            <img
              src={dish.image}
              alt={dish.name}
              className="
              w-full
              h-52
              object-cover
              "
            />

          ) : (

            <div
              className="
              w-full
              h-52
              bg-gray-100
              flex
              items-center
              justify-center
              text-gray-400
              "
            >
              No Image
            </div>

          )
        }



        {/* VEG INDICATOR */}

        <div
          className="
          absolute
          top-4
          left-4
          bg-white
          rounded-full
          w-8
          h-8
          flex
          items-center
          justify-center
          shadow
          "
        >

          {
            dish.foodType === "veg"
            ?
            "🟢"
            :
            "🔴"
          }

        </div>



        {
          dish.isBestseller && (

            <div
              className="
              absolute
              top-4
              right-4
              bg-orange-500
              text-white
              text-xs
              font-bold
              px-3
              py-1
              rounded-full
              "
            >
              Popular
            </div>

          )
        }


      </div>




      {/* CONTENT */}


      <div
        className="
        p-5
        "
      >


        <h3
          className="
          text-lg
          font-bold
          text-gray-900
          "
        >

          {dish.name}

        </h3>



        {
          dish.description && (

            <p
              className="
              text-sm
              text-gray-500
              mt-2
              line-clamp-2
              leading-5
              "
            >

              {dish.description}

            </p>

          )
        }




        <div
          className="
          flex
          items-center
          justify-between
          mt-5
          "
        >


          <div>


            <p
              className="
              text-xl
              font-bold
              text-gray-900
              "
            >

              ₹{Number(dish.price || 0).toFixed(0)}

            </p>


            {
              dish.prepTime && (

                <p
                  className="
                  flex
                  items-center
                  gap-1
                  text-xs
                  text-gray-400
                  mt-1
                  "
                >

                  <FiClock size={12}/>

                  {dish.prepTime} min

                </p>

              )
            }


          </div>




          {/* ADD BUTTON */}


          {
            !isAvailable ? (

              <span
                className="
                text-sm
                text-gray-400
                font-semibold
                "
              >
                Unavailable
              </span>


            )

            :

            quantity === 0 ? (

              <button
                onClick={() =>
                  onAdd(dish)
                }
                className="
                bg-orange-500
                text-white
                px-5
                py-2.5
                rounded-xl
                font-bold
                flex
                items-center
                gap-2
                hover:bg-orange-600
                "
              >

                <FiPlus size={16}/>

                Add

              </button>


            )

            :

            (

              <div
                className="
                flex
                items-center
                gap-3
                bg-orange-50
                border
                border-orange-200
                rounded-xl
                px-3
                py-2
                "
              >


                <button
                  onClick={() =>
                    onDecrease(dish._id)
                  }
                  className="
                  w-7
                  h-7
                  rounded-lg
                  bg-white
                  flex
                  items-center
                  justify-center
                  text-orange-600
                  "
                >

                  <FiMinus size={14}/>

                </button>



                <span
                  className="
                  font-bold
                  "
                >

                  {quantity}

                </span>




                <button
                  onClick={() =>
                    onIncrease(dish._id)
                  }
                  className="
                  w-7
                  h-7
                  rounded-lg
                  bg-orange-500
                  text-white
                  flex
                  items-center
                  justify-center
                  "
                >

                  <FiPlus size={14}/>

                </button>


              </div>

            )

          }



        </div>


      </div>


    </div>

  );
}