/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Minimal palette per repo notes — real design time still owed to
        // the mother's timeline screen specifically (PRD, C4).
        clay: { 50: "#fdf8f4", 100: "#f6e9dd", 500: "#b06a3a", 700: "#7c4522" },
        plum: { 500: "#7c3f58", 700: "#582a3e" },
        overdue: "#b3261e",
        due: "#b06a3a",
        done: "#3a7d5c",
      },
    },
  },
  plugins: [],
};
