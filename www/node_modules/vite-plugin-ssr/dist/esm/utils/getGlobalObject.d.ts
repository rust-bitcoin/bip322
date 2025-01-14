export declare function getGlobalObject<T extends Record<string, unknown> = never>(key: `${string}.ts`, defaultValue: T): T;
declare global {
    var __vite_plugin_ssr: undefined | Record<string, Record<string, unknown>>;
}
