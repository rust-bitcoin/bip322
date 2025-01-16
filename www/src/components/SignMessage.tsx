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

const inputClass = `
  font-mono 
  text-white 
  text-[length:var(--font-x-small)] 
  md:text-[length:var(--font-x-small)] 
  px-4 py-8 
  border-[0.5px] border-white/80
  rounded-xl
  [box-shadow:var(--white-glow)]
  hover:[box-shadow:var(--white-glow-large)]
  focus-visible:[box-shadow:var(--white-glow-large)]
  focus:[box-shadow:var(--white-glow-large)]
  [text-shadow:var(--white-glow-small)]
  disabled:text-white/60 
  disabled:opacity-100 
  disabled:cursor-pointer
  transition-[all,box-shadow] duration-300
`;

const textareaClass = `
  font-mono 
  text-white 
  text-[length:var(--font-x-small)] 
  md:text-[length:var(--font-x-small)] 
  px-4 py-4 
  min-h-[120px] 
  resize-none 
  border-[0.5px] border-white/80 
  rounded-xl
  [box-shadow:var(--white-glow)]
  hover:[box-shadow:var(--white-glow-large)]
  focus-visible:[box-shadow:var(--white-glow-large)]
  focus:[box-shadow:var(--white-glow-large)]
  [text-shadow:var(--white-glow-small)]
  disabled:text-white/60 
  disabled:opacity-100 
  disabled:cursor-pointer
  transition-[all,box-shadow] duration-300
`;

const buttonClass = `
  w-full h-auto 
  font-mono 
  border-[0.5px] border-white/80 
  hover:bg-white hover:text-black 
  transition-[all,box-shadow,text-shadow] duration-300
  text-[length:var(--font-x-small)]
  rounded-xl
  [box-shadow:var(--white-glow)]
  hover:[box-shadow:var(--white-glow-large)]
  [text-shadow:0_0_4px_rgba(0,0,0,0.3),0_0_8px_rgba(0,0,0,0.2)]
  hover:[text-shadow:0_0_6px_rgba(0,0,0,0.4),0_0_12px_rgba(0,0,0,0.3)]
`;

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
