export { getFilePathToShowToUser };
export type { FilePath };
type FilePath = {
    filePathAbsolute: string;
    filePathRelativeToUserRootDir: null | string;
};
declare function getFilePathToShowToUser(filePath: FilePath): string;
