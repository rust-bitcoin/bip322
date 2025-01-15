import React from "react";
import FormWrapper from "./FormWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SignMessageFormProps {
  address: string;
  message: string;
  onMessageChange: (message: string) => void;
  onSign: () => void;
  onReset: () => void;
}

interface SignedMessageDisplayProps {
  address: string;
  message: string;
  signature: string;
  onReset: () => void;
}

const inputClass =
  "font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-8 backdrop-blur-sm disabled:border-[#cccccc] disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";
const textareaClass =
  "font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-4 min-h-[120px] resize-none backdrop-blur-sm disabled:border-[#cccccc] disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";
const buttonClass =
  "w-full h-auto font-mono border border-white/80 bg-white/90 text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-200 text-[length:var(--font-x-small)] backdrop-blur-sm";

export const SignedMessageDisplay: React.FC<SignedMessageDisplayProps> = ({
  address,
  message,
  signature,
  onReset,
}) => {
  return (
    <FormWrapper title="message signed.">
      <div className="space-y-6">
        <Input
          type="text"
          id="address"
          placeholder="address"
          value={address}
          disabled
          className={inputClass}
        />
        <Textarea
          id="message"
          placeholder="message"
          value={message}
          disabled
          className={textareaClass}
        />
        <Input
          type="text"
          id="signature"
          placeholder="signature"
          value={signature}
          disabled
          className={inputClass}
        />
        <Button
          variant="ghost"
          onClick={onReset}
          className="inset-x-0 mx-auto w-auto hover:underline text-[length:var(--font-x-small)] font-mono"
        >
          reset
        </Button>
      </div>
    </FormWrapper>
  );
};

const SignMessageForm: React.FC<SignMessageFormProps> = ({
  address,
  message,
  onMessageChange,
  onSign,
  onReset,
}) => {
  return (
    <FormWrapper title="sign message.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSign();
        }}
        className="space-y-6"
      >
        <Input
          type="text"
          id="connected-wallet"
          placeholder="connected wallet"
          value={address}
          disabled
          className={inputClass}
        />
        <Textarea
          id="message"
          placeholder="message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          required
          className={textareaClass}
        />
        <Button type="submit" className={buttonClass}>
          sign
        </Button>
        <Button
          variant="ghost"
          onClick={onReset}
          className="inset-x-0 mx-auto w-auto hover:underline text-[length:var(--font-x-small)] font-mono"
        >
          reset
        </Button>
      </form>
    </FormWrapper>
  );
};

export default SignMessageForm;
