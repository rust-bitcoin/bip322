import React from "react";

interface SignMessageFormProps {
  address: string;
  message: string;
  onMessageChange: (message: string) => void;
  onSign: () => void;
}

interface SignedMessageDisplayProps {
  address: string;
  message: string;
  signature: string;
}

export const SignedMessageDisplay: React.FC<SignedMessageDisplayProps> = ({
  address,
  message,
  signature,
}) => {
  return (
    <div className="verify-form-container">
      <div className="verify-form-background" />
      <form id="signed-message-form">
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
    </div>
  );
};

const SignMessageForm: React.FC<SignMessageFormProps> = ({
  address,
  message,
  onMessageChange,
  onSign,
}) => {
  return (
    <div className="verify-form-container">
      <div className="verify-form-background" />
      <form
        id="sign-message-form"
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
    </div>
  );
};

export default SignMessageForm;
