export { getPrettyErrorWithCodeSnippet };
export { isErrorWithCodeSnippet };
export { isEquivalentErrorWithCodeSnippet };
export type { ErrorWithCodeSnippet };
export { getPrettyErrMessage };
type ErrorWithCodeSnippet = {
    id: string;
    frame?: string;
    message?: string;
    plugin?: string;
};
declare function isErrorWithCodeSnippet(err: unknown): err is ErrorWithCodeSnippet;
declare function getPrettyErrorWithCodeSnippet(err: ErrorWithCodeSnippet, userRootDir: string): string;
declare function getPrettyErrMessage(err: ErrorWithCodeSnippet): string | null;
declare function isEquivalentErrorWithCodeSnippet(err1: unknown, err2: unknown): boolean;
