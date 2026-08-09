import React, { useState } from "react";

export default function KitchenBoard({
  newOrders = [],
  preparingOrders = [],
  pausedOrders = [],
  updateStatus,
  getLocation,
  getWaitingMinutes,
}) {

  const [modalType, setModalType] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState("");


  const openModal = (type, order) => {
    setModalType(type);
    setSelectedOrder(order);
    setReason("");
  };


  const closeModal = () => {
    setModalType(null);
    setSelectedOrder(null);
    setReason("");
  };


  const submitAction = () => {

    if (!selectedOrder) return;

    if (!reason.trim()) return;


    updateStatus(
      selectedOrder._id,
      modalType === "pause"
        ? "paused"
        : "cancelled",
      reason
    );


    closeModal();

  };



  const columns = [

    {
      title:"🔥 NEW",
      orders:newOrders,
      type:"new",
      color:"text-red-400"
    },

    {
      title:"👨‍🍳 PREPARING",
      orders:preparingOrders,
      type:"preparing",
      color:"text-blue-400"
    },

    {
      title:"⏸ PAUSED",
      orders:pausedOrders,
      type:"paused",
      color:"text-orange-400"
    }

  ];



  return (

    <>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


        {
          columns.map((col)=>(


            <div
              key={col.title}
              className="
              bg-slate-900
              border
              border-slate-800
              rounded-xl
              overflow-hidden
              "
            >


              <div
                className={`
                px-3
                py-2
                border-b
                border-slate-800
                font-black
                text-lg
                ${col.color}
                `}
              >

                {col.title}


                <span
                  className="
                  ml-2
                  bg-slate-800
                  text-white
                  rounded-full
                  px-2
                  py-1
                  text-xs
                  "
                >
                  {col.orders.length}
                </span>


              </div>



              <div
                className="
                p-2
                space-y-2
                max-h-[calc(100vh-170px)]
                overflow-y-auto
                "
              >


              {
                col.orders.length === 0 ? (

                  <div
                    className="
                    text-center
                    text-slate-500
                    text-sm
                    py-6
                    "
                  >
                    No Orders
                  </div>

                ) : (


                  col.orders.map(order=>(


                    <div
                      key={order._id}
                      className="
                      bg-slate-950
                      border
                      border-slate-800
                      rounded-lg
                      p-3
                      "
                    >



                      <div className="flex justify-between">


                        <div>

                          <p
                            className="
                            text-white
                            font-bold
                            text-sm
                            "
                          >
                            #{order._id?.slice(-5)}
                          </p>


                          <p
                            className="
                            text-xs
                            text-slate-400
                            "
                          >
                            {
                              getLocation
                              ? getLocation(order)
                              : "Table"
                            }
                          </p>


                        </div>



                        <p
                          className={
                            getWaitingMinutes(order.createdAt) > 15
                            ?
                            "text-red-400 text-xs font-bold"
                            :
                            "text-green-400 text-xs font-bold"
                          }
                        >

                          ⏱ {getWaitingMinutes(order.createdAt)}m

                        </p>


                      </div>




                      <div className="mt-2 space-y-1">


                        {
                          order.items
                          ?.slice(0,3)
                          .map((item,index)=>(

                            <div
                              key={index}
                              className="
                              text-xs
                              text-slate-300
                              flex
                              justify-between
                              "
                            >

                              <span>
                                {item.name}
                              </span>


                              <span>
                                x{item.quantity}
                              </span>

                            </div>

                          ))
                        }


                      </div>





                      <div className="flex gap-2 mt-3">



                        {
                          col.type==="new" && (

                            <>

                            <button
                              onClick={()=>
                                updateStatus(
                                  order._id,
                                  "preparing"
                                )
                              }
                              className="
                              flex-1
                              bg-green-600
                              hover:bg-green-700
                              text-white
                              text-xs
                              font-bold
                              py-2
                              rounded-lg
                              "
                            >
                              Accept
                            </button>


                            <button
                              onClick={()=>
                                openModal(
                                  "cancel",
                                  order
                                )
                              }
                              className="
                              bg-red-600
                              text-white
                              text-xs
                              px-3
                              rounded-lg
                              "
                            >
                              Cancel
                            </button>


                            </>

                          )
                        }







                        {
                          col.type==="preparing" && (

                            <>


                            <button
                              onClick={()=>
                                updateStatus(
                                  order._id,
                                  "ready"
                                )
                              }
                              className="
                              flex-1
                              bg-purple-600
                              hover:bg-purple-700
                              text-white
                              text-xs
                              font-bold
                              py-2
                              rounded-lg
                              "
                            >
                              Mark Ready
                            </button>



                            <button
                              onClick={()=>
                                openModal(
                                  "pause",
                                  order
                                )
                              }
                              className="
                              bg-orange-600
                              text-white
                              text-xs
                              px-3
                              rounded-lg
                              "
                            >
                              Pause
                            </button>


                            <button
                              onClick={()=>
                                openModal(
                                  "cancel",
                                  order
                                )
                              }
                              className="
                              bg-red-600
                              text-white
                              text-xs
                              px-3
                              rounded-lg
                              "
                            >
                              Cancel
                            </button>



                            </>

                          )
                        }






                        {
                          col.type==="paused" && (

                            <>

                            <button
                              onClick={()=>
                                updateStatus(
                                  order._id,
                                  "preparing"
                                )
                              }
                              className="
                              flex-1
                              bg-green-600
                              text-white
                              text-xs
                              font-bold
                              py-2
                              rounded-lg
                              "
                            >
                              Resume
                            </button>



                            <button
                              onClick={()=>
                                openModal(
                                  "cancel",
                                  order
                                )
                              }
                              className="
                              bg-red-600
                              text-white
                              text-xs
                              px-3
                              rounded-lg
                              "
                            >
                              Cancel
                            </button>


                            </>

                          )
                        }



                      </div>



                    </div>


                  ))

                )

              }



              </div>


            </div>


          ))
        }



      </div>







      {
        modalType && (

          <div
            className="
            fixed
            inset-0
            bg-black/60
            flex
            items-center
            justify-center
            z-50
            "
          >


            <div
              className="
              bg-slate-900
              border
              border-slate-700
              rounded-xl
              p-5
              w-[350px]
              "
            >


              <h2
                className="
                text-white
                font-bold
                mb-3
                "
              >

                {
                  modalType==="pause"
                  ?
                  "Pause Order"
                  :
                  "Cancel Order"
                }

              </h2>



              <textarea
                value={reason}
                onChange={(e)=>
                  setReason(e.target.value)
                }
                placeholder={
                  modalType==="pause"
                  ?
                  "Reason: ingredient unavailable..."
                  :
                  "Reason: dish unavailable..."
                }
                className="
                w-full
                h-24
                bg-slate-950
                border
                border-slate-700
                rounded-lg
                p-2
                text-white
                text-sm
                "
              />



              <div className="flex gap-2 mt-3">


                <button
                  onClick={closeModal}
                  className="
                  flex-1
                  bg-slate-700
                  text-white
                  py-2
                  rounded-lg
                  text-sm
                  "
                >
                  Cancel
                </button>



                <button
                  onClick={submitAction}
                  className={`
                  flex-1
                  text-white
                  py-2
                  rounded-lg
                  text-sm
                  font-bold
                  ${
                    modalType==="pause"
                    ?
                    "bg-orange-600"
                    :
                    "bg-red-600"
                  }
                  `}
                >
                  Confirm
                </button>


              </div>



            </div>


          </div>

        )
      }



    </>

  );

}