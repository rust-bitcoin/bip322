import React from "react";
import FormWrapper from "./FormWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerifyFormState } from "@/App";

interface VerifyFormProps {
  formData: VerifyFormState;
  verificationResult: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

const VerifyForm = ({
  formData,
  verificationResult,
  onSubmit,
  onInputChange,
  onReset,
  onBack,
}: VerifyFormProps) => {
  return (
    <FormWrapper
      title="verify message"
      onBack={!verificationResult ? onBack : undefined}
      onReset={verificationResult ? onReset : undefined}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <Input
          type="text"
          id="address"
          placeholder="address"
          value={formData.address}
          onChange={onInputChange}
          data-default={formData.address}
          required
          disabled={verificationResult !== null}
          className={inputClass}
        />
        <Input
          type="text"
          id="message"
          placeholder="message"
          value={formData.message}
          onChange={onInputChange}
          data-default={formData.message}
          required
          disabled={verificationResult !== null}
          className={inputClass}
        />
        <Input
          type="text"
          id="signature"
          placeholder="signature"
          value={formData.signature}
          onChange={onInputChange}
          data-default={formData.signature}
          required
          disabled={verificationResult !== null}
          className={inputClass}
        />

        {verificationResult === null ? (
          <Button type="submit" className={buttonClass}>
            verify
          </Button>
        ) : (
          <div
            className={`
            font-mono 
            border-[0.5px] border-white/80 
            p-3 
            rounded-xl 
            transition-[all,box-shadow] duration-300 
            backdrop-blur-sm 
            text-[length:var(--font-x-small)]
            ${
              verificationResult === "true"
                ? "bg-white text-black [box-shadow:var(--white-glow-large)] [text-shadow:0_0_4px_rgba(0,0,0,0.3),0_0_8px_rgba(0,0,0,0.2)]"
                : "bg-transparent/5 text-white [box-shadow:var(--white-glow)] [text-shadow:var(--white-glow)]"
            }
          `}
          >
            {verificationResult}
          </div>
        )}
      </form>
    </FormWrapper>
  );
};

export default VerifyForm;
