import React from "react";
import FormWrapper from "@/components/FormWrapper";
import { BaseInput } from "@/components/ui/base-input";
import { BaseButton } from "@/components/ui/base-button";
import { BaseTextarea } from "@/components/ui/base-textarea";

interface SignMessageFormProps {
  address: string;
  message: string;
  signedData: {
    address: string;
    message: string;
    signature: string;
  } | null;
  onMessageChange: (message: string) => void;
  onSign: () => void;
  onReset: () => void;
  onBack: () => void;
}

const SignMessageForm: React.FC<SignMessageFormProps> = ({
  address,
  message,
  signedData,
  onMessageChange,
  onSign,
  onReset,
  onBack,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSign();
  };

  return (
    <FormWrapper
      title="sign message"
      onReset={signedData ? onReset : undefined}
      onBack={!signedData ? onBack : undefined}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-[calc(var(--size)*0.06)] h-full"
      >
        <BaseInput
          type="text"
          id="connected-wallet"
          placeholder="connected wallet"
          value={signedData ? signedData.address : address}
          disabled
        />
        <BaseTextarea
          id="message"
          placeholder="message"
          value={signedData ? signedData.message : message}
          onChange={(e) => !signedData && onMessageChange(e.target.value)}
          required
          disabled={signedData !== null}
        />
        {signedData ? (
          <BaseInput
            type="text"
            id="signature"
            placeholder="signature"
            value={signedData.signature}
            disabled
          />
        ) : (
          <BaseButton variant="default" type="submit">
            sign
          </BaseButton>
        )}
      </form>
    </FormWrapper>
  );
};

export default SignMessageForm;
