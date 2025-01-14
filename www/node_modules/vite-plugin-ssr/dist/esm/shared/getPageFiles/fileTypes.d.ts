export type { FileType };
export { fileTypes };
export { isValidFileType };
export { determineFileType };
declare const fileTypes: readonly [".page", ".page.server", ".page.route", ".page.client", ".css"];
type FileType = (typeof fileTypes)[number];
declare function isValidFileType(filePath: string): boolean;
declare function determineFileType(filePath: string): FileType;
