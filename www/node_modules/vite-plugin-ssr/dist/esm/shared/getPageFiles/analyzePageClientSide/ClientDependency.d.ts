export type { ClientDependency };
type ClientDependency = {
    id: string;
    onlyAssets: boolean;
    eagerlyImported: boolean;
};
