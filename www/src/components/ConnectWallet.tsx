import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import FormWrapper from "./FormWrapper";

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
  const baseButtonClass =
    "w-full h-auto border border-white/80 transition-all duration-200 p-2 hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] [&_svg]:!w-10 [&_svg]:!h-10";

  return (
    <FormWrapper title="connect wallet">
      <div className="grid grid-cols-3 gap-4">
        {!address ? (
          Object.values(SUPPORTED_WALLETS).map((wallet) => {
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
          })
        ) : (
          <div className="col-span-3 space-y-3">
            <Input
              type="text"
              value={`Connected: ${address}`}
              disabled
              className="font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-small)] p-3 backdrop-blur-sm"
            />
            <Button
              className="w-full font-mono border border-white/80 bg-transparent/5 text-white hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-200 text-[length:var(--font-small)] backdrop-blur-sm"
              onClick={onDisconnect}
            >
              disconnect
            </Button>
          </div>
        )}
      </div>
    </FormWrapper>
  );
};

export default ConnectWalletForm;
