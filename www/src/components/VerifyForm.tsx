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

const inputClass =
  "font-mono bg-transparent/5 border border-white/80 text-white text-[length:var(--font-x-small)] md:text-[length:var(--font-x-small)] px-4 py-8 backdrop-blur-sm disabled:border-[#cccccc] disabled:text-white/60 disabled:opacity-100 disabled:cursor-pointer";
const buttonClass =
  "w-full h-auto font-mono border border-white/80 bg-white/90 text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-200 text-[length:var(--font-x-small)] backdrop-blur-sm";

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
      title={verificationResult ? "message verified." : "verify message."}
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
            className={`font-mono border border-white/80 p-3 rounded-md transition-all duration-200 backdrop-blur-sm text-[length:var(--font-x-small)] ${
              verificationResult === "true"
                ? "bg-white text-black shadow-[0_0_15px_#fff]"
                : "bg-transparent/5 text-white"
            }`}
          >
            {verificationResult}
          </div>
        )}
      </form>
    </FormWrapper>
  );
};

export default VerifyForm;
