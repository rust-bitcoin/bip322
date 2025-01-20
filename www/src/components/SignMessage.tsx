import { useState } from "react";
import FormWrapper from "@/components/FormWrapper";
import { BaseInput } from "@/components/ui/base-input";
import { BaseButton } from "@/components/ui/base-button";
import { BaseTextarea } from "@/components/ui/base-textarea";
import ConnectWalletForm from "./ConnectWallet";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useSignMessage } from "@/hooks/useSignMessage";

interface SignMessageFormProps {
  message: string;
  signedData: {
    address: string;
    message: string;
    signature: string;
  } | null;
  onMessageChange: (message: string) => void;
  onSign: () => void;
  onReset: () => void;
}

const SignMessageForm = ({
  message,
  signedData,
  onMessageChange,
  onSign,
  onReset,
}: SignMessageFormProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [walletState, walletActions] = useWalletConnection();
  const [signState] = useSignMessage();

  if (!isVisible) {
    return (
      <BaseButton variant="large" onClick={() => setIsVisible(true)}>
        sign
      </BaseButton>
    );
  }

  const handleBack = () => {
    onReset();
    walletActions.handleDisconnect();
  };

  return (
    <div className="w-full transition-all duration-300 ease-in-out">
      <div className="w-full bg-primary/5 border-border/40 backdrop-blur rounded-xl animate-in fade-in slide-in-from-bottom-4">
        {!walletState.isConnected ? (
          <ConnectWalletForm onBack={() => setIsVisible(false)} />
        ) : (
          <FormWrapper
            title="sign message"
            onReset={signedData ? onReset : undefined}
            onBack={handleBack}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSign();
              }}
              className="flex flex-col gap-[calc(var(--size)*0.06)]"
            >
              <BaseInput
                type="text"
                placeholder="connected wallet"
                value={
                  signState.signedData
                    ? signState.signedData.address
                    : walletState.address ?? ""
                }
                disabled
                tooltipLabel="address"
              />

              <BaseTextarea
                placeholder="message"
                value={signedData ? signedData.message : message}
                onChange={(e) => !signedData && onMessageChange(e.target.value)}
                required
                disabled={signedData !== null}
                tooltipLabel="message"
                variant="three-lines"
              />

              {signedData ? (
                <BaseInput
                  type="text"
                  placeholder="signature"
                  value={signedData.signature}
                  disabled
                  tooltipLabel="signature"
                />
              ) : (
                <BaseButton variant="default" type="submit">
                  sign
                </BaseButton>
              )}
            </form>
          </FormWrapper>
        )}
      </div>
    </div>
  );
};

export default SignMessageForm;
