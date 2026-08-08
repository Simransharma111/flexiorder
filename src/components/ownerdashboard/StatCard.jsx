
export default function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,

  primaryColor,
  accentColor,

  mutedText,
  surfaceBg,
  borderColor,

  themeText,
}) {
  return (
    <div
      className="
      rounded-2xl
      p-4
      transition
      hover:-translate-y-1
      "
      style={{
        background: surfaceBg,
        border: `1px solid ${borderColor}`,
        color: themeText,
      }}
    >

      <div className="flex items-start justify-between">


        {/* CONTENT */}

        <div>

          <p
            className="text-sm"
            style={{
              color: mutedText,
            }}
          >
            {title}
          </p>


          <h3
            className="
            mt-2
            text-2xl
            font-bold
            "
          >
            {value}
          </h3>



          {
            subtitle && (

              <p
                className="
                mt-1
                text-xs
                "
                style={{
                  color: mutedText,
                }}
              >
                {subtitle}
              </p>

            )
          }


        </div>





        {/* ICON */}

        <div
          className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          "
          style={{
            background:
              `${primaryColor}25`,

            color:
              accentColor,
          }}
        >

          <Icon size={20}/>

        </div>


      </div>


    </div>
  );
}
