import {
  ProviderType,
  SUPPORTED_WALLETS,
  WalletIcon,
} from "@omnisat/lasereyes";
import FormWrapper from "@/components/FormWrapper";
import { BaseButton } from "@/components/ui/base-button";

interface ConnectWalletFormProps {
  provider: string | null;
  hasWallet: {
    [key: string]: boolean;
  };
  onConnect: (walletName: ProviderType) => Promise<void>;
  onDisconnect: () => void;
}

const ConnectWalletForm = ({
  hasWallet,
  onConnect,
  onDisconnect,
}: ConnectWalletFormProps) => {
  return (
    <FormWrapper title="connect wallet" onBack={onDisconnect}>
      <div className="grid grid-cols-3 gap-[calc(var(--size)*0.06)]">
        {Object.values(SUPPORTED_WALLETS)
          .filter(
            (wallet) => wallet.name !== "op_net" && wallet.name !== "wizz"
          )
          .map((wallet) => {
            const isMissingWallet = !hasWallet[wallet.name];
            return (
              <div key={wallet.name} className="w-full">
                {isMissingWallet ? (
                  <BaseButton variant="icon" asChild>
                    <a
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WalletIcon walletName={wallet.name} size={32} />
                    </a>
                  </BaseButton>
                ) : (
                  <BaseButton
                    variant="icon"
                    className="wallet-button-available"
                    onClick={() => onConnect(wallet.name)}
                  >
                    <WalletIcon walletName={wallet.name} size={32} />
                  </BaseButton>
                )}
              </div>
            );
          })}
      </div>
      <div className="input-placeholder"></div>
    </FormWrapper>
  );
};

export default ConnectWalletForm;
