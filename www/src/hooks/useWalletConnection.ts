import { useLaserEyes, MAGIC_EDEN, ProviderType } from "@omnisat/lasereyes";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  provider: string | null;
  hasWallet: {
    [key: string]: boolean;
  };
}

interface WalletActions {
  handleConnect: (walletName: ProviderType) => Promise<void>;
  handleDisconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

export const useWalletConnection = (): [WalletState, WalletActions] => {
  const {
    connect,
    disconnect,
    address,
    provider,
    hasUnisat,
    hasXverse,
    hasOyl,
    hasMagicEden,
    hasOkx,
    hasLeather,
    hasPhantom,
    connected,
    signMessage: sign,
  } = useLaserEyes();

  const hasWallet = {
    unisat: hasUnisat,
    xverse: hasXverse,
    oyl: hasOyl,
    [MAGIC_EDEN]: hasMagicEden,
    okx: hasOkx,
    leather: hasLeather,
    phantom: hasPhantom,
  };

  const handleConnect = async (walletName: ProviderType) => {
    if (provider === walletName) {
      await disconnect();
    } else {
      await connect(walletName as never);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!connected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      return await sign(message, address);
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw error;
    }
  };

  return [
    { 
      isConnected: connected, 
      address, 
      provider, 
      hasWallet 
    },
    { 
      handleConnect, 
      handleDisconnect, 
      signMessage 
    }
  ];
};