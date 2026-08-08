import DishCard from "./DishCard";


export default function MenuSection({
  categories,
  dishes,
  activeCategory,
  setActiveCategory,
  getCartQuantity,
  addToCart,
  decreaseQuantity,
  increaseQuantity,
  orderingEnabled = true,
}) {


  const filteredDishes =
    activeCategory === "All"
      ? dishes
      : dishes.filter((dish) => {

          let category = dish.category;

          if (typeof category === "object") {
            category = category?.name;
          }

          return category === activeCategory;

        });



  return (

    <section className="max-w-6xl mx-auto px-4 mt-8">


      {/* CATEGORY TABS */}

      <div
        className="
        flex
        gap-3
        overflow-x-auto
        pb-3
        scrollbar-hide
        "
      >

        {categories.map((category) => {


          const count =
            category === "All"
              ? dishes.length
              : dishes.filter((dish)=>{

                  let cat =
                    dish.category;

                  if(typeof cat === "object"){
                    cat =
                    cat?.name;
                  }

                  return cat === category;

                }).length;



          return (

            <button

              key={category}

              onClick={() =>
                setActiveCategory(category)
              }

              className={`
                whitespace-nowrap
                px-5
                py-3
                rounded-full
                text-sm
                font-semibold
                transition

                ${
                  activeCategory === category
                  ?
                  "bg-orange-500 text-white shadow-md"
                  :
                  "bg-white border border-gray-200 text-gray-700"
                }
              `}

            >

              {category}


              <span
                className={`
                ml-2
                text-xs
                px-2
                py-0.5
                rounded-full

                ${
                  activeCategory === category
                  ?
                  "bg-white/20"
                  :
                  "bg-gray-100"
                }

                `}
              >

                {count}

              </span>


            </button>

          );


        })}

        {categories.length > 5 && (
          <span className="sticky right-0 shrink-0 self-center bg-gray-50 px-2 text-xs font-semibold text-gray-500">
            More ›
          </span>
        )}


      </div>



      {/* HEADER */}


      <div
        className="
        flex
        items-center
        justify-between
        mt-6
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

            {activeCategory === "All"
              ? "Our Menu"
              : activeCategory}

          </h2>


          <p
            className="
            text-sm
            text-gray-500
            mt-1
            "
          >

            Freshly prepared dishes

          </p>

        </div>



        <span
          className="
          text-xs
          text-gray-400
          "
        >

          {filteredDishes.length} items

        </span>


      </div>




      {/* DISH GRID */}


      {
        filteredDishes.length === 0 ? (

          <div
            className="
            bg-white
            border
            border-gray-200
            rounded-3xl
            p-10
            text-center
            "
          >

            <p
              className="
              font-semibold
              text-gray-700
              "
            >

              No dishes available

            </p>


            <p
              className="
              text-sm
              text-gray-500
              mt-2
              "
            >

              Try another category

            </p>


          </div>


        )

        :

        (

          <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-5
            "
          >


            {
              filteredDishes.map((dish)=>(

                <DishCard

                  key={dish._id}

                  dish={dish}

                  quantity={
                    getCartQuantity(
                      dish._id
                    )
                  }

                  onAdd={
                    addToCart
                  }

                  onDecrease={
                    decreaseQuantity
                  }

                  onIncrease={
                    increaseQuantity
                  }

                  orderingEnabled={orderingEnabled}

                />

              ))
            }


          </div>

        )
      }


    </section>

  );

}
