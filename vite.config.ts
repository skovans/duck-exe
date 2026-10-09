import { defineConfig } from 'vite';

// BASE_PATH is optional. Default './' supports both project Pages and a custom domain.
export default defineConfig({
  base: process.env.BASE_PATH || './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
