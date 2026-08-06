import {
  FiShoppingBag,
  FiMapPin,
} from "react-icons/fi";

export default function GuestHeader({
  hotel,
  table,
  cartCount,
  onCart,
}) {

  return (
    <header className="
      sticky
      top-0
      z-50
      px-4
      pt-3
    ">

      <div className="
        max-w-6xl
        mx-auto
        bg-white/90
        backdrop-blur-xl
        border
        border-gray-100
        shadow-sm
        rounded-2xl
        px-4
        py-3
        flex
        items-center
        justify-between
      ">


        {/* HOTEL BRAND */}

        <div className="
          flex
          items-center
          gap-3
          min-w-0
        ">


          {/* LOGO */}

          <div className="
            w-11
            h-11
            rounded-xl
            overflow-hidden
            bg-orange-100
            flex
            items-center
            justify-center
            shrink-0
          ">

            {
              hotel?.logo
              ?

              <img
                src={hotel.logo}
                alt={hotel.name}
                className="
                  w-full
                  h-full
                  object-cover
                "
              />

              :

              <span className="
                text-orange-600
                font-bold
                text-lg
              ">
                {hotel?.name?.charAt(0) || "H"}
              </span>

            }

          </div>



          {/* NAME */}

          <div className="
            min-w-0
          ">

            <h1 className="
              font-bold
              text-gray-900
              text-sm
              truncate
            ">
              {hotel?.name || "Hotel"}
            </h1>


            <div className="
              flex
              items-center
              gap-1
              text-xs
              text-gray-500
              mt-0.5
            ">

              <FiMapPin
                size={12}
                className="text-orange-500"
              />

              <span>
                {
                  table?.locationNumber
                  ||
                  table?.roomNumber
                  ||
                  "Guest"
                }
              </span>

            </div>


          </div>


        </div>




        {/* CART BUTTON */}

        <button
          onClick={onCart}
          className="
            relative
            w-11
            h-11
            rounded-xl
            bg-orange-500
            hover:bg-orange-600
            text-white
            flex
            items-center
            justify-center
            transition
          "
        >

          <FiShoppingBag
            size={20}
          />


          {
            cartCount > 0 && (

              <span className="
                absolute
                -top-1
                -right-1
                bg-white
                text-orange-600
                text-[11px]
                font-bold
                w-5
                h-5
                rounded-full
                flex
                items-center
                justify-center
                shadow
              ">

                {cartCount}

              </span>

            )
          }


        </button>



      </div>


    </header>
  );
}