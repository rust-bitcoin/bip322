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
  "font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-8 backdrop-blur-sm disabled:border-[#cccccc] disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";
const textareaClass =
  "font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-4 min-h-[120px] resize-none backdrop-blur-sm disabled:border-[#cccccc] disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";
const buttonClass =
  "w-full h-auto font-mono border border-white/80 bg-white/90 text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-200 text-[length:var(--font-x-small)] backdrop-blur-sm";

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
