export { getHttpRequestAsyncStore };
export { installHttpRequestAsyncStore };
type HttpRequestAsyncStore = {
    httpRequestId: number;
    shouldErrorBeSwallowed: (err: unknown) => boolean;
    markErrorAsLogged: (err: unknown) => void;
    markErrorMessageAsLogged: (errMsg: string) => void;
    errorDebugNoteAlreadyShown: boolean;
};
declare function installHttpRequestAsyncStore(): Promise<void>;
declare function getHttpRequestAsyncStore(): null | undefined | HttpRequestAsyncStore;
