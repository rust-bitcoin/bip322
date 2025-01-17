import { Button } from "@/components/ui/button";
import { SUPPORTED_WALLETS, WalletIcon } from "@omnisat/lasereyes";
import FormWrapper from "./FormWrapper";

interface ConnectWalletFormProps {
  provider: string | null;
  hasWallet: {
    [key: string]: boolean;
  };
  onConnect: (
    walletName: (typeof SUPPORTED_WALLETS)[keyof typeof SUPPORTED_WALLETS]["name"]
  ) => Promise<void>;
  onDisconnect: () => void;
}
const ConnectWalletForm = ({
  hasWallet,
  onConnect,
  onDisconnect,
}: ConnectWalletFormProps) => {
  const baseButtonClass = `
    w-full h-auto 
    border border-white/80 
    transition-[all,box-shadow] duration-300 
    p-2 
    hover:bg-white hover:text-black 
    [&_svg]:!w-10 [&_svg]:!h-10
    rounded-xl
    [box-shadow:var(--white-glow)]
    hover:[box-shadow:var(--white-glow-large)]
  `;
  return (
    <FormWrapper title="connect wallet" onBack={onDisconnect}>
      <div className="grid grid-cols-3 gap-4">
        {Object.values(SUPPORTED_WALLETS)
          .filter(
            (wallet) => wallet.name !== "op_net" && wallet.name !== "wizz"
          )
          .map((wallet) => {
            console.log(wallet);
            const isMissingWallet = !hasWallet[wallet.name];
            return (
              <div key={wallet.name} className="w-full">
                {isMissingWallet ? (
                  <Button
                    asChild
                    className={`${baseButtonClass} bg-transparent/5 backdrop-blur-sm`}
                  >
                    <a
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <WalletIcon walletName={wallet.name} size={40} />
                    </a>
                  </Button>
                ) : (
                  <Button
                    className={`${baseButtonClass} bg-white/90 text-black backdrop-blur-sm`}
                    onClick={() => onConnect(wallet.name)}
                  >
                    <WalletIcon walletName={wallet.name} size={40} />
                  </Button>
                )}
              </div>
            );
          })}
      </div>
    </FormWrapper>
  );
};

export default ConnectWalletForm;
