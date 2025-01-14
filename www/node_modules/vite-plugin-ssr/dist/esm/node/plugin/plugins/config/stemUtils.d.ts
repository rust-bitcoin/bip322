export { getStemPackages };
export type { StemPackage };
type StemPackage = {
    stemPackageName: string;
    stemPackageRootDir: string;
    loadModule: (moduleId: string) => Promise<null | Record<string, unknown>>;
};
declare function getStemPackages(userAppRootDir: string): Promise<StemPackage[]>;
