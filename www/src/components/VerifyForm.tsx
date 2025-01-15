import React from "react";

interface VerifyFormProps {
  formData: {
    address: string;
    message: string;
    signature: string;
  };
  verificationResult: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

const VerifyForm = ({
  formData,
  verificationResult,
  onSubmit,
  onInputChange,
  onInputFocus,
  onInputBlur,
  onReset,
}: VerifyFormProps) => {
  return (
    <div className="form-container">
      <form id="verify-form" className="form-wrapper" onSubmit={onSubmit}>
        <input
          type="text"
          id="address"
          placeholder="address"
          value={formData.address}
          onChange={onInputChange}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          data-default={formData.address}
          required
          disabled={verificationResult !== null}
        />
        <input
          type="text"
          id="message"
          placeholder="message"
          value={formData.message}
          onChange={onInputChange}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          data-default={formData.message}
          required
          disabled={verificationResult !== null}
        />
        <input
          type="text"
          id="signature"
          placeholder="signature"
          value={formData.signature}
          onChange={onInputChange}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          data-default={formData.signature}
          required
          disabled={verificationResult !== null}
        />
        {verificationResult === null ? (
          <button type="submit" id="verify-button">
            verify
          </button>
        ) : (
          <div
            className={`verification-box ${
              verificationResult === "true"
                ? "verification-true"
                : "verification-false"
            }`}
          >
            {verificationResult}
          </div>
        )}
      </form>
      {verificationResult !== null && (
        <button className="reset-button" onClick={onReset}>
          reset
        </button>
      )}
    </div>
  );
};

export default VerifyForm;
