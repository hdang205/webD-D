import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rootDir = fs.existsSync(__dirname) ? fs.realpathSync(__dirname) : __dirname;
  return {
    root: rootDir,
    base: './', // 👈 THÊM DÒNG NÀY VÀO ĐÂY ĐỂ TRÁNH LỖI TRẮNG MÀN HÌNH KHI CHẠY APP (.EXE)
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
