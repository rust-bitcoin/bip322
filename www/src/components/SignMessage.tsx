import React from "react";
import FormWrapper from "./FormWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const inputClass =
  "font-mono text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-8 border border-white/80 disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";

const textareaClass =
  "font-mono text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-4 min-h-[120px] resize-none border border-white/80 disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";

const buttonClass =
  "w-full h-auto font-mono border border-white/80 hover:bg-white hover:text-black transition-all duration-200 text-[length:var(--font-x-small)]";

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
      title={signedData ? "message signed." : "sign message."}
      onReset={signedData ? onReset : undefined}
      onBack={!signedData ? onBack : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="text"
          id="connected-wallet"
          placeholder="connected wallet"
          value={signedData ? signedData.address : address}
          disabled
          className={inputClass}
        />
        <Textarea
          id="message"
          placeholder="message"
          value={signedData ? signedData.message : message}
          onChange={(e) => !signedData && onMessageChange(e.target.value)}
          required
          disabled={signedData !== null}
          className={textareaClass}
        />
        {signedData ? (
          <Input
            type="text"
            id="signature"
            placeholder="signature"
            value={signedData.signature}
            disabled
            className={inputClass}
          />
        ) : (
          <Button type="submit" className={buttonClass}>
            sign
          </Button>
        )}
      </form>
    </FormWrapper>
  );
};

export default SignMessageForm;
