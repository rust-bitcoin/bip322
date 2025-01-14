// TODO/v1-release - move:
//   import { navigate, prefetch } from 'vite-plugin-ssr/client/router'
// to:
//   import { navigate, prefetch } from 'vite-plugin-ssr'
// Use package.json#exports to make the imports isomorphic.
export { navigate, reload } from './navigate.js';
export { prefetch } from './prefetch.js';
