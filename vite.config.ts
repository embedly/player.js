import { defineConfig } from 'vite-plus';

// Output for every build: modern browsers. IE11 and older are not supported.
const target = 'es2017';

export default defineConfig({
  pack: [
    // npm, ESM: default export (the playerjs namespace) plus named exports.
    {
      entry: { index: 'src/index.ts' },
      format: 'esm',
      platform: 'browser',
      fixedExtension: true,
      target,
      dts: true,
      sourcemap: true,
      publint: true,
      // Only remove what these builds produce: dist/ also holds the committed
      // 0.1.0 release files, which people may still link to.
      clean: ['dist/index.*', 'dist/player.*'],
    },
    // npm, CommonJS: module.exports is the playerjs namespace, as
    // require('player.js') has always returned.
    {
      entry: { index: 'src/browser.ts' },
      format: 'cjs',
      platform: 'browser',
      fixedExtension: true,
      target,
      dts: true,
      sourcemap: true,
      clean: false,
    },
    // CDN / <script>: UMD that sets window.playerjs (or AMD define /
    // module.exports), readable and minified.
    ...[false, true].map((minify) => ({
      entry: { [minify ? 'player.min' : 'player']: 'src/browser.ts' },
      format: 'umd' as const,
      globalName: 'playerjs',
      platform: 'browser' as const,
      target,
      minify,
      sourcemap: true,
      clean: false,
      outputOptions: { entryFileNames: '[name].js' },
    })),
  ],

  // Unit tests (Vitest). The Playwright suite in e2e/ runs separately.
  test: {
    include: ['test/**/*.test.ts'],
  },

  fmt: {
    ignorePatterns: ['dist/**', 'test-results/**', 'playwright-report/**'],
    singleQuote: true,
    semi: true,
    printWidth: 100,
    sortPackageJson: true,
  },

  lint: {
    ignorePatterns: ['dist/**', 'test-results/**', 'playwright-report/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
