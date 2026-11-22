/** @type {import('tailwindcss').Config} */
export default {
  // Every file that contains Tailwind class names, including the ones
  // assembled in JavaScript template strings (markers, inspector, sidebar).
  content: ['./index.html', './src/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkbg: '#0b0f19',
        cardbg: '#131b2e',
        panelbg: '#182238'
      }
    }
  },
  plugins: []
};
