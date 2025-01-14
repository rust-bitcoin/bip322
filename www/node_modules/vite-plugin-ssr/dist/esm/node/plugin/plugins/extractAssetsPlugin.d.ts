export { extractAssetsPlugin };
export { extractAssetsRE };
import type { Plugin } from 'vite';
declare const extractAssetsRE: RegExp;
declare function extractAssetsPlugin(): Plugin[];
