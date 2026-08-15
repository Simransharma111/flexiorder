/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00796B",
          strong: "#005F55",
          light: "#E8F2F0",
          subtle: "#F1F7F5",
        },
        canvas: "#F6F8F7",
        card: "#FFFFFF",
        subtle: "#EEF3F1",
        ink: {
          DEFAULT: "#17201D",
          secondary: "#55625D",
          disabled: "#8C9793",
        },
        hairline: "#DCE4E1",
        edge: "#B8C5C0",
        focus: "#0B70D1",
        status: {
          new: { surface: "#FFF5E5", line: "#D97706", ink: "#7A3E00" },
          preparing: { surface: "#EEF5FF", line: "#2563EB", ink: "#173F7A" },
          ready: { surface: "#ECF8EF", line: "#16A34A", ink: "#166534" },
          delayed: { surface: "#FFF1F2", line: "#DC2626", ink: "#991B1B" },
        },
        note: { surface: "#FFF7E6", ink: "#7A3E00" },
      },
      borderRadius: {
        card: "10px",
        sheet: "14px",
        panel: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 32, 29, 0.05)",
        pop: "0 8px 24px rgba(23, 32, 29, 0.14)",
        lift: "0 12px 32px rgba(23, 32, 29, 0.10)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};
