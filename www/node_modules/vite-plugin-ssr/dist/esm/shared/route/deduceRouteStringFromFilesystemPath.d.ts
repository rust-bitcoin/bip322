export { deduceRouteStringFromFilesystemPath };
export type { FilesystemRoot };
type FilesystemRoot = {
    filesystemRoot: string;
    urlRoot: string;
};
declare function deduceRouteStringFromFilesystemPath(pageId: string, filesystemRoots: FilesystemRoot[]): string;
