import React, { useState } from "react";
import FormWrapper from "@/components/FormWrapper";
import { BaseInput } from "@/components/ui/base-input";
import { BaseButton } from "@/components/ui/base-button";
import type { VerifyFormState } from "@/hooks/useVerifyMessage";
import { BaseTextarea } from "./ui/base-textarea";

interface VerifyFormProps {
  formData: VerifyFormState;
  verificationResult: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onReset: () => void;
}

const VerifyForm = ({
  formData,
  verificationResult,
  onSubmit,
  onInputChange,
  onReset,
}: VerifyFormProps) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <BaseButton variant="large" onClick={() => setIsVisible(true)}>
        verify
      </BaseButton>
    );
  }

  return (
    <div className="w-full transition-all duration-300 ease-in-out">
      <div className="w-full bg-primary/5 border-border/40 backdrop-blur rounded-xl animate-in fade-in slide-in-from-bottom-4">
        <FormWrapper
          title="verify message"
          onBack={!verificationResult ? () => setIsVisible(false) : undefined}
          onReset={verificationResult ? onReset : undefined}
        >
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-[calc(var(--size)*0.06)] h-full"
          >
            <BaseInput
              type="text"
              id="address"
              placeholder="address"
              value={formData.address}
              onChange={onInputChange}
              data-default={formData.address}
              required
              disabled={verificationResult !== null}
              tooltipLabel="address"
            />

            <BaseTextarea
              id="message"
              placeholder="message"
              value={formData.message}
              onChange={onInputChange}
              data-default={formData.message}
              required
              disabled={verificationResult !== null}
              tooltipLabel="message"
              variant="two-lines"
            />

            <BaseInput
              type="text"
              id="signature"
              placeholder="signature"
              value={formData.signature}
              onChange={onInputChange}
              data-default={formData.signature}
              required
              disabled={verificationResult !== null}
              tooltipLabel="signature"
            />

            {verificationResult === null ? (
              <BaseButton variant="default" type="submit">
                verify
              </BaseButton>
            ) : (
              <BaseInput
                type="text"
                id="verification-result"
                value={verificationResult}
                variant="verification"
                verificationResult={verificationResult === "true"}
                readOnly
              />
            )}
          </form>
        </FormWrapper>
      </div>
    </div>
  );
};

export default VerifyForm;
