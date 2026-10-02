/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 山水 + 烟火 —— 溧水调
        ls: {
          ink: '#1c3a5a',
          lake: '#3d8fbf',
          mountain: '#5a7f5a',
          fire: '#c0562a',
          rice: '#f6efe2',
          mist: '#eef3f8',
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
