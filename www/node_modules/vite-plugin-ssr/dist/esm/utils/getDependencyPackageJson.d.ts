export { getDependencyPackageJson };
export { getDependencyPackageJsonPath };
export { getDependencyRootDir };
declare function getDependencyPackageJson(npmPackageName: string, userAppRootDir: string): Record<string, unknown>;
declare function getDependencyRootDir(npmPackageName: string, userAppRootDir: string): string;
declare function getDependencyPackageJsonPath(npmPackageName: string, userAppRootDir: string): string;
