import React from "react";
import FormWrapper from "@/components/FormWrapper";
import { VerifyFormState } from "@/App";
import { BaseInput } from "@/components/ui/base-input";
import { BaseButton } from "@/components/ui/base-button";

interface VerifyFormProps {
  formData: VerifyFormState;
  verificationResult: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onBack: () => void;
}

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
        />

        <BaseInput
          type="text"
          id="message"
          placeholder="message"
          value={formData.message}
          onChange={onInputChange}
          data-default={formData.message}
          required
          disabled={verificationResult !== null}
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
  );
};

export default VerifyForm;
