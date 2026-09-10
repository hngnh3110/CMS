import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
const output = 'directus/extensions/vtv-module/dist';
export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'inline-extension-css',
      closeBundle() {
        const cssFiles = readdirSync(output).filter((f) => f.endsWith('.css'));
        const css = cssFiles
          .map((f) => readFileSync(join(output, f), 'utf8'))
          .join('\n');
        if (!css) throw Error('Native module stylesheet missing.');
        const js = join(output, 'index.js');
        writeFileSync(
          js,
          `const vtvStyle=document.createElement('style');vtvStyle.dataset.vtvCms='true';vtvStyle.textContent=${JSON.stringify(css)};\n` +
            readFileSync(js, 'utf8'),
        );
        for (const f of cssFiles) unlinkSync(join(output, f));
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('../', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: output,
    emptyOutDir: true,
    lib: {
      entry: 'directus/extensions/vtv-module/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: { external: ['vue', '@directus/extensions-sdk'] },
  },
});
