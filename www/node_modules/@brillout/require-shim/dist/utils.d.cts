export declare function toPosixPath(path: string): string;
export declare function assertPosixPath(path: string): void;
export declare function assert(condition: unknown, debugInfo?: string): asserts condition;
export declare function assertIsNotBrowser(): void;
export declare function pathJoin(path1: string, path2: string): string;
export declare function isVitest(): boolean;
export declare function getGlobalObject<T extends Record<string, unknown> = never>(key: `${string}.ts`, defaultValue: T): T;
declare global {
    var __brillout_require_shim: undefined | Record<string, Record<string, unknown>>;
}
