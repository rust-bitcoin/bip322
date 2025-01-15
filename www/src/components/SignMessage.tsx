import React from "react";

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

export const SignedMessageDisplay: React.FC<SignedMessageDisplayProps> = ({
  address,
  message,
  signature,
  onReset,
}) => {
  return (
    <div className="form-container">
      <form id="signed-message-form" className="form-wrapper">
        <input
          type="text"
          id="address"
          placeholder="address"
          value={address}
          disabled
        />
        <input
          type="text"
          id="message"
          placeholder="message"
          value={message}
          disabled
        />
        <input
          type="text"
          id="signature"
          placeholder="signature"
          value={signature}
          disabled
        />
      </form>
      <button className="reset-button" onClick={onReset}>
        reset
      </button>
    </div>
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
    <div className="form-container">
      <form
        id="sign-message-form"
        className="form-wrapper"
        onSubmit={(e) => {
          e.preventDefault();
          onSign();
        }}
      >
        <input
          type="text"
          id="connected-wallet"
          placeholder="connected wallet"
          value={address}
          disabled
        />
        <input
          type="text"
          id="message"
          placeholder="message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          required
        />
        <button type="submit" id="sign-button">
          sign
        </button>
      </form>
      <button className="reset-button" onClick={onReset}>
        reset
      </button>
    </div>
  );
};

export default SignMessageForm;
