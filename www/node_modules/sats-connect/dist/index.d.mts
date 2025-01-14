import { SupportedWallet, Requests, Params, RpcResult, AddListener } from '@sats-connect/core';
export * from '@sats-connect/core';
import { Config } from '@sats-connect/ui';

declare class Wallet {
    private providerId;
    private defaultAdapters;
    private createCustomConfig?;
    private isProviderSet;
    setCreateCustomConfig(createCustomConfig: (providers: SupportedWallet[]) => Config): void;
    selectProvider(): Promise<void>;
    disconnect(): Promise<void>;
    request<Method extends keyof Requests>(method: Method, params: Params<Method>): Promise<RpcResult<Method>>;
    addListener: AddListener;
}

declare const _default: Wallet;

export { _default as default };
