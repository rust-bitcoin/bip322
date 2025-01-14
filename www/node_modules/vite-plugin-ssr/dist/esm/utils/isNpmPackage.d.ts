export { isNpmPackageImport };
export { isNpmPackageName };
export { getNpmPackageName };
export { getNpmPackageImportPath };
export { isValidPathAlias };
export { parse };
export { isDistinguishable };
declare function isNpmPackageImport(str: string): boolean;
declare function isNpmPackageName(str: string | undefined): boolean;
declare function getNpmPackageName(str: string): null | string;
declare function getNpmPackageImportPath(str: string): null | string;
declare function isValidPathAlias(alias: string): boolean;
declare function isDistinguishable(alias: string): boolean;
declare function parse(str: string | undefined): null | {
    pkgName: string;
    importPath: null | string;
};
