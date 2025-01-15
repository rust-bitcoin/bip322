import {
  SUPPORTED_WALLETS,
  WalletIcon,
  UNISAT,
  MAGIC_EDEN,
  OYL,
  ORANGE,
  PHANTOM,
  LEATHER,
  XVERSE,
  WIZZ,
  OKX,
} from "@omnisat/lasereyes";

interface ConnectWalletFormProps {
  address: string | null;
  provider: string | null;
  hasWallet: {
    [key: string]: boolean;
  };
  onConnect: (
    walletName:
      | typeof UNISAT
      | typeof MAGIC_EDEN
      | typeof OYL
      | typeof ORANGE
      | typeof PHANTOM
      | typeof LEATHER
      | typeof XVERSE
      | typeof WIZZ
      | typeof OKX
  ) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const ConnectWalletForm = ({
  address,
  hasWallet,
  onConnect,
  onDisconnect,
}: ConnectWalletFormProps) => {
  return (
    <div className="column">
      <h2>connect wallet</h2>
      <div className="buttons-grid">
        {!address ? (
          Object.values(SUPPORTED_WALLETS).map((wallet) => {
            const isMissingWallet = !hasWallet[wallet.name];
            return (
              <div key={wallet.name} className="wallet-button-container">
                {isMissingWallet ? (
                  <a
                    href={wallet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-button wallet-button-install"
                  >
                    <div className="wallet-button-content">
                      <WalletIcon walletName={wallet.name} size={40} />
                    </div>
                    {/* <span className="install-text">Install</span> */}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="wallet-button wallet-button-installed"
                    onClick={() => onConnect(wallet.name)}
                  >
                    <div className="wallet-button-content">
                      <WalletIcon walletName={wallet.name} size={40} />
                    </div>
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <>
            <input
              type="text"
              value={`Connected: ${address}`}
              disabled
              className="connected-address"
            />
            <button
              type="button"
              className="wallet-button"
              onClick={onDisconnect}
            >
              disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectWalletForm;
