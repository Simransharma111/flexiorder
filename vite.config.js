import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  test: {
    include: ["src/**/*.test.{js,jsx}"],
  },
});
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   test: {
//     include: ['src/**/*.test.{js,jsx}'],
//   },
//   build: {
//     rollupOptions: {
//       external: [
//         '@capacitor/filesystem',
//         '@capacitor/app',
//         '@capacitor/device',
//         '@capacitor/local-notifications',
//         '@capacitor/push-notifications',
//         '@capacitor/share',
//         'exceljs',
//         'jspdf',
//         'html2canvas',
//       ],
//     },
//   },
// })
