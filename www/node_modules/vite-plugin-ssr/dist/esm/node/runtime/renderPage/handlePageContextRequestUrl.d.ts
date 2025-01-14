export { handlePageContextRequestUrl };
declare function handlePageContextRequestUrl(url: string): {
    urlWithoutPageContextRequestSuffix: string;
    isPageContextRequest: boolean;
};
