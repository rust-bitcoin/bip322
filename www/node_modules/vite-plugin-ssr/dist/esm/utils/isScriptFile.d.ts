export { isScriptFile };
export { isTemplateFile };
export { scriptFileExtensions };
export { scriptFileExtensionList };
declare const scriptFileExtensionList: readonly ["js", "ts", "cjs", "cts", "mjs", "mts", "jsx", "tsx", "cjsx", "ctsx", "mjsx", "mtsx", "vue", "svelte", "marko", "md", "mdx"];
declare const scriptFileExtensions: string;
declare function isScriptFile(filePath: string): boolean;
declare function isTemplateFile(filePath: string): boolean;
