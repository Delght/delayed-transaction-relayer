/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'primary-gradient':
          'linear-gradient(90deg, rgba(250,163,0,0.3) 0%, rgba(250,163,0,1) 100%)',
      },
    },
  },
  plugins: [],
};
