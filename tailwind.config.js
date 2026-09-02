/** @type {import('tailwindcss').Config} */
module.exports = {
  // Вкажіть шляхи до всіх директорій з компонентами та екранами
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};