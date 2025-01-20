import { SUPPORTED_WALLETS, WalletIcon } from "@omnisat/lasereyes";
import FormWrapper from "@/components/FormWrapper";
import { BaseButton } from "@/components/ui/base-button";
import { useWalletConnection } from "@/hooks/useWalletConnection";

interface ConnectWalletFormProps {
  onBack: () => void;
}

const ConnectWalletForm = ({ onBack }: ConnectWalletFormProps) => {
  const [walletState, walletActions] = useWalletConnection();

  return (
    <FormWrapper title="connect wallet" onBack={onBack}>
      <div className="grid grid-cols-3 gap-[calc(var(--size)*0.06)]">
        {Object.values(SUPPORTED_WALLETS)
          .filter(
            (wallet) => wallet.name !== "op_net" && wallet.name !== "wizz"
          )
          .map((wallet) => {
            const isMissingWallet = !walletState.hasWallet[wallet.name];
            return (
              <div key={wallet.name} className="w-full">
                {isMissingWallet ? (
                  <BaseButton
                    variant="icon"
                    asChild
                    className="bg-transparent/5 backdrop-blur-sm"
                  >
                    <a
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <WalletIcon walletName={wallet.name} size={32} />
                    </a>
                  </BaseButton>
                ) : (
                  <BaseButton
                    variant="icon"
                    className="wallet-button-available"
                    onClick={() => walletActions.handleConnect(wallet.name)}
                  >
                    <WalletIcon walletName={wallet.name} size={32} />
                  </BaseButton>
                )}
              </div>
            );
          })}
      </div>
      <div className="input-placeholder" />
    </FormWrapper>
  );
};

export default ConnectWalletForm;
