export { createDebugger };
export { isDebugEnabled };
export type { Debug };
type Namespace = 'vps:error' | 'vps:extractAssets' | 'vps:extractExportNames' | 'vps:glob' | 'vps:pageFiles' | 'vps:log' | 'vps:routing' | 'vps:virtual-files' | 'vps:stem' | 'vps:stream';
type Debug = ReturnType<typeof createDebugger>;
type Options = {
    serialization?: {
        emptyArray?: string;
    };
};
declare function createDebugger(namespace: Namespace, optionsGlobal?: Options): ((...msgs: unknown[]) => void) & {
    options: (options: Options) => (...msgs: unknown[]) => void;
    isEnabled: boolean;
};
declare function isDebugEnabled(namespace: Namespace): boolean;
