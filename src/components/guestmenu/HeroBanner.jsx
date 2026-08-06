import {
  FiClock,
  FiStar,
  FiMapPin,
} from "react-icons/fi";


export default function HeroBanner({
  hotel,
  table,
}) {


  return (

    <section className="
      px-4
      mt-4
    ">


      <div className="
        max-w-6xl
        mx-auto
        relative
        overflow-hidden
        rounded-3xl
        h-[300px]
        md:h-[360px]
        shadow-lg
      ">


        {/* BACKGROUND IMAGE */}

        {
          hotel?.coverImage
          ?

          <img
            src={hotel.coverImage}
            alt={hotel.name}
            className="
              w-full
              h-full
              object-cover
            "
          />

          :

          <div
            className="
              w-full
              h-full
              bg-gradient-to-br
              from-orange-400
              via-orange-500
              to-red-500
            "
          />

        }



        {/* OVERLAY */}

        <div className="
          absolute
          inset-0
          bg-gradient-to-t
          from-black/70
          via-black/20
          to-transparent
        "/>



        {/* CONTENT */}

        <div className="
          absolute
          bottom-0
          left-0
          right-0
          p-5
          md:p-8
          text-white
        ">


          {/* BADGES */}

          <div className="
            flex
            gap-2
            mb-3
            flex-wrap
          ">


            <span className="
              bg-white/20
              backdrop-blur
              px-3
              py-1.5
              rounded-full
              text-xs
              font-semibold
              flex
              items-center
              gap-1
            ">

              <FiStar
                className="
                  text-yellow-300
                  fill-yellow-300
                "
                size={13}
              />

              4.8

            </span>



            <span className="
              bg-green-500/90
              px-3
              py-1.5
              rounded-full
              text-xs
              font-semibold
            ">

              Open Now

            </span>


          </div>




          {/* HOTEL NAME */}

          <h1 className="
            text-3xl
            md:text-4xl
            font-extrabold
            tracking-tight
          ">

            {hotel?.name || "Welcome"}

          </h1>



          {
            hotel?.tagline && (

              <p className="
                text-sm
                md:text-base
                text-white/80
                mt-1
              ">

                {hotel.tagline}

              </p>

            )
          }



          {/* DETAILS */}

          <div className="
            flex
            items-center
            gap-4
            mt-4
            text-sm
            text-white/90
            flex-wrap
          ">


            <div className="
              flex
              items-center
              gap-1.5
            ">

              <FiClock
                size={15}
              />

              20-30 min

            </div>



            <div className="
              flex
              items-center
              gap-1.5
            ">

              <FiMapPin
                size={15}
              />

              {
                table?.locationNumber
                ||
                table?.roomNumber
                ||
                "Your Table"
              }

            </div>


          </div>


        </div>


      </div>


    </section>

  );
}