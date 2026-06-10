import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/test-results/**', '**/playwright-report/**'],
  },
  resolve: {
    alias: {
      '/wxt.svg': resolve(__dirname, './public/wxt.svg'),
    },
  },
});
