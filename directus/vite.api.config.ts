import { defineConfig } from 'vite';
export default defineConfig({
  publicDir: false,
  build: {
    target: 'node22',
    outDir: 'directus/extensions/vtv-api/dist',
    emptyOutDir: true,
    lib: {
      entry: 'directus/extensions/vtv-api/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: { external: [/^node:/] },
  },
});
