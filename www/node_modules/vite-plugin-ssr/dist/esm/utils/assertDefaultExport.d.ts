export { assertDefaultExportUnknown };
export { assertDefaultExportObject };
declare function assertDefaultExportUnknown(fileExports: Record<string, unknown>, filePath: string): asserts fileExports is Record<string, unknown> & {
    default: unknown;
};
declare function assertDefaultExportObject(fileExports: Record<string, unknown>, filePath: string): asserts fileExports is {
    default: Record<string, unknown>;
};
