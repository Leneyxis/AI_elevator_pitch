/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Pages router
    './src/pages/**/*.{js,ts,jsx,tsx}',
    // App router (if you ever switch)
    // './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:        '#16D5A8',
        'primary-light':'#CCF0E8',
        biscay:         '#18326F',
        danube:         '#6288CE',
        malibu:         '#87B2FF',
      },
      borderRadius: {
        xl:  '1rem',   // 16px
        '2xl': '1.5rem', // 24px
      },
      boxShadow: {
        'card-light':  '0 4px 20px rgba(0, 0, 0, 0.05)',
        'card-strong': '0 8px 40px rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        cs: 'cubic-bezier(.25,.8,.25,1)',
      },
    },
  },
  plugins: [],
};
