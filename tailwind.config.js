/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lapento: {
          green: '#36B49E',
          'green-dark': '#2A8C7B',
          'green-light': '#7CD4BD',
          blue: '#1E4768',
          brown: '#58380B',
          ink: '#2A2A28',
          bg: '#FAFAF7',
        },
      },
    },
  },
  plugins: [],
};
