export { virtualFileIdImportUserCodeServer };
export { virtualFileIdImportUserCodeClientSR };
export { virtualFileIdImportUserCodeClientCR };
export { isVirtualFileIdImportUserCode };
declare const virtualFileIdImportUserCodeServer = "virtual:vite-plugin-ssr:importUserCode:server";
declare const virtualFileIdImportUserCodeClientSR = "virtual:vite-plugin-ssr:importUserCode:client:server-routing";
declare const virtualFileIdImportUserCodeClientCR = "virtual:vite-plugin-ssr:importUserCode:client:client-routing";
declare function isVirtualFileIdImportUserCode(id: string): false | {
    isForClientSide: boolean;
    isClientRouting: boolean;
};
