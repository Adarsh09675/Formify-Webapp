import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'main.js',
      name: 'FormifyWidget',
      fileName: 'widget',
      formats: ['iife'], // immediately invoked
    },
    cssCodeSplit: false,
  }
});
