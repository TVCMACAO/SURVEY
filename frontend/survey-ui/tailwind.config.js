/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-blue-500', 'shadow-blue-500/40',
    'bg-gray-500', 'shadow-gray-500/40',
    'bg-purple-500', 'shadow-purple-500/40',
    'bg-green-500', 'shadow-green-500/40',
    'bg-orange-500', 'shadow-orange-500/40',
    'bg-yellow-500', 'shadow-yellow-500/40',
    'bg-pink-500', 'shadow-pink-500/40',
    'bg-red-500', 'shadow-red-500/40',
    'bg-indigo-500', 'shadow-indigo-500/40',
    'bg-emerald-500', 'shadow-emerald-500/40',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
