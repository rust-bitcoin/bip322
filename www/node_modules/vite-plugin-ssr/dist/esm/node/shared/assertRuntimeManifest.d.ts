export { assertRuntimeManifest };
export type { RuntimeManifest };
type RuntimeManifest = {
    baseServer: string;
    baseAssets: string;
    includeAssetsImportedByServer: boolean;
    redirects: Record<string, string>;
    trailingSlash: boolean;
    disableUrlNormalization: boolean;
};
declare function assertRuntimeManifest(obj: unknown): asserts obj is RuntimeManifest & Record<string, unknown>;
