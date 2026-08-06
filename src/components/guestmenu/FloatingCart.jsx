import {
  FiShoppingBag,
  FiChevronRight
} from "react-icons/fi";


export default function FloatingCart({
  cartCount,
  cartTotal,
  onCart,
}) {


  if (cartCount === 0) {
    return null;
  }


  return (

    <div
      className="
      fixed
      bottom-0
      left-0
      right-0
      z-50
      px-4
      pb-4
      "
    >

      <div
        className="
        max-w-6xl
        mx-auto
        "
      >

        <button

          onClick={onCart}

          className="
          w-full
          bg-gray-900
          text-white
          rounded-2xl
          px-5
          py-4
          flex
          items-center
          justify-between
          shadow-2xl
          hover:bg-black
          transition
          "

        >


          {/* LEFT */}

          <div
            className="
            flex
            items-center
            gap-3
            "
          >

            <div
              className="
              w-11
              h-11
              rounded-xl
              bg-white/10
              flex
              items-center
              justify-center
              "
            >

              <FiShoppingBag
                size={20}
              />

            </div>


            <div
              className="
              text-left
              "
            >

              <p
                className="
                text-xs
                text-gray-300
                "
              >

                {cartCount}{" "}

                {
                  cartCount === 1
                  ? "item"
                  : "items"
                }

              </p>


              <p
                className="
                font-bold
                text-lg
                "
              >

                ₹{cartTotal.toFixed(0)}

              </p>


            </div>


          </div>



          {/* RIGHT */}


          <div
            className="
            flex
            items-center
            gap-2
            font-semibold
            "
          >

            View Cart

            <FiChevronRight />

          </div>


        </button>


      </div>


    </div>

  );

}