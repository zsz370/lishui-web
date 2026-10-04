/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 山水 + 烟火 —— 溧水调
        ls: {
          ink: '#284736',
          lake: '#627b51',
          mountain: '#687b55',
          fire: '#a6784b',
          rice: '#f6f3ec',
          mist: '#edf0e6',
        },
      },
      fontFamily: {
        cn: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Microsoft YaHei"', 'serif'],
        ui: ['"Noto Sans SC"', '"Source Han Sans SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
