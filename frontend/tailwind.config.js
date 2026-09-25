/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F3E9",
        cream: "#FFF9E9",
        forest: "#263E32",     // deep forest — nav bg, headings on light
        leaf: "#789878",       // leaf green — timeline vine, secondary accent
        sage: "#B9CBAE",       // soft sage — card fills
        clay: "#A86950",       // clay — overdue accent
        terracotta: "#C98262", // soft terracotta — risk flags
        turmeric: "#E7C86B",   // turmeric — due/upcoming accent
        sky: "#AFCBD0",        // muted sky — backgrounds
        earth: "#80644E",      // earth brown — borders, secondary text
        ink: "#26352E",        // ink — primary text
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        // body stays Karla, set globally in index.css
      },
      boxShadow: {
        pixel: "3px 3px 0 0 rgba(38,53,46,0.35)",
      },
    },
  },
  plugins: [],
};