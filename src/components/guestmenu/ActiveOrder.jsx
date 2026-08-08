import {
  FiClock,
  FiLoader,
} from "react-icons/fi";
import { useRef, useState } from "react";


export default function ActiveOrder({
  orders,
  loading,
}) {

  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event) => {
    const width = event.currentTarget.clientWidth || 1;
    setActiveIndex(
      Math.round(event.currentTarget.scrollLeft / width)
    );
  };


  if (!orders || orders.length === 0) {
    return null;
  }


  return (

    <section
      className="
      max-w-6xl
      mx-auto
      px-4
      mt-8
      "
    >


      <div
        className="
        flex
        items-center
        justify-between
        mb-4
        "
      >

        <div>

          <h2
            className="
            text-xl
            font-bold
            text-gray-900
            "
          >
            Your Order
          </h2>


          <p
            className="
            text-sm
            text-gray-500
            "
          >
            Live kitchen updates
          </p>

        </div>



        {
          loading && (

            <FiLoader
              className="
              animate-spin
              text-orange-500
              "
              size={20}
            />

          )
        }


      </div>





      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="
        flex
        gap-3
        overflow-x-auto
        snap-x
        snap-mandatory
        scrollbar-hide
        "
      >

        {
          orders.map((order)=>(


            <div

              key={order._id}

              className="min-w-full snap-center"
            >

            <div

              className="
              bg-white
              rounded-3xl
              border
              border-gray-100
              shadow-sm
              p-5
              "

            >


              {/* ITEMS */}

              <div
                className="
                flex
                justify-between
                gap-4
                "
              >

                <div>

                  <h3
                    className="
                    font-bold
                    text-gray-900
                    "
                  >

                    Order

                  </h3>


                  <p
                    className="
                    text-sm
                    text-gray-500
                    mt-1
                    "
                  >

                    {
                      order.items?.map(
                        (item)=>
                          `${item.name} × ${item.quantity || 1}`
                      )
                      .join(", ")
                    }

                  </p>


                </div>



                <StatusBadge
                  status={
                    order.status
                  }
                />


              </div>





              {/* STATUS MESSAGE */}


              <div
                className="
                mt-5
                bg-orange-50
                rounded-2xl
                p-4
                flex
                gap-3
                items-center
                "
              >


                <div
                  className="
                  w-10
                  h-10
                  rounded-full
                  bg-white
                  flex
                  items-center
                  justify-center
                  text-orange-500
                  "
                >

                  <FiClock/>

                </div>


                <div>

                  <p
                    className="
                    font-semibold
                    text-gray-900
                    "
                  >

                    {getStatusTitle(
                      order.status
                    )}

                  </p>


                  <p
                    className="
                    text-xs
                    text-gray-500
                    mt-1
                    "
                  >

                    {getStatusMessage(
                      order.status
                    )}

                  </p>

                </div>


              </div>





            </div>

            </div>


          ))
        }


      </div>

      {orders.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-label="Order pages">
          {orders.map((order, index) => (
            <button
              key={order._id}
              type="button"
              aria-label={`Show order ${index + 1}`}
              onClick={() => {
                sliderRef.current?.children[index]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "start",
                });
              }}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-5 bg-orange-500"
                  : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}


    </section>

  );

}






function StatusBadge({
  status
}) {


  const style = {

    pending:
    "bg-yellow-100 text-yellow-700",

    accepted:
    "bg-blue-100 text-blue-700",

    preparing:
    "bg-orange-100 text-orange-700",

    ready:
    "bg-green-100 text-green-700",

    delivered:
    "bg-green-100 text-green-700",

    cancelled:
    "bg-red-100 text-red-700",

  };


  return (

    <span
      className={`
      px-3
      py-1
      rounded-full
      text-xs
      font-bold
      ${
        style[status]
        ||
        "bg-gray-100 text-gray-700"
      }
      `}
    >

      {getPublicStatusLabel(status)}

    </span>

  );

}




function getStatusTitle(status){

  switch(status){

    case "pending":
      return "Order received";

    case "accepted":
      return "Kitchen accepted";

    case "preparing":
      return "Preparing your food";

    case "ready":
      return "Ready to serve";

    case "delivered":
      return "Delivered";

    default:
      return "Updating order";

  }

}

function getPublicStatusLabel(status){
  switch(status){
    case "pending":
      return "Received";
    case "accepted":
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Updating";
  }
}




function getStatusMessage(status){

  switch(status){

    case "pending":
      return "Waiting for kitchen confirmation";

    case "accepted":
      return "Your order is being prepared soon";

    case "preparing":
      return "Chef is preparing your meal";

    case "ready":
      return "Your order is ready";

    case "delivered":
      return "Enjoy your meal";

    default:
      return "";

  }

}
