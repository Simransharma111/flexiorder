import DishCard from "./DishCard";


export default function FeaturedSection({
  title,
  dishes,
  getQuantity,
  onAdd,
  onDecrease,
  onIncrease,
}) {


  if (!dishes || dishes.length === 0) {
    return null;
  }


  return (

    <section className="max-w-6xl mx-auto px-4 mt-10">


      {/* HEADER */}

      <div
        className="
        flex
        items-center
        justify-between
        mb-5
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
            {title}
          </h2>


          <p
            className="
            text-sm
            text-gray-500
            mt-1
            "
          >
            Chef selected favourites
          </p>


        </div>



        <span
          className="
          text-xs
          bg-orange-50
          text-orange-600
          px-3
          py-1.5
          rounded-full
          font-semibold
          "
        >

          {dishes.length} items

        </span>


      </div>




      {/* HORIZONTAL CARDS */}


      <div
        className="
        flex
        gap-5
        overflow-x-auto
        pb-3
        scrollbar-hide
        "
      >

        {
          dishes.map((dish)=>(


            <div

              key={dish._id}

              className="
              min-w-[260px]
              max-w-[260px]
              "

            >


              <DishCard

                dish={dish}

                quantity={
                  getQuantity(
                    dish._id
                  )
                }

                onAdd={
                  onAdd
                }

                onDecrease={
                  onDecrease
                }

                onIncrease={
                  onIncrease
                }

              />


            </div>


          ))
        }


      </div>


    </section>

  );

}