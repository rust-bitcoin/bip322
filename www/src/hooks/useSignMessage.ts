import { useState } from 'react';

export interface SignMessageState {
  message: string;
  signedData: {
    address: string;
    message: string;
    signature: string;
  } | null;
}

interface SignMessageActions {
  setMessage: (message: string) => void;
  handleSign: (address: string, signFn: (message: string) => Promise<string>) => Promise<void>;
  reset: () => void;
}

export const useSignMessage = (): [SignMessageState, SignMessageActions] => {
  const [state, setState] = useState<SignMessageState>({
    message: "",
    signedData: null,
  });

  const setMessage = (message: string) => {
    setState(prev => ({ ...prev, message }));
  };

  const handleSign = async (address: string, signFn: (message: string) => Promise<string>) => {
    if (!state.message) return;

    try {
      const signature = await signFn(state.message);
      setState(prev => ({
        ...prev,
        signedData: {
          address,
          message: state.message,
          signature,
        },
      }));
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw error;
    }
  };

  const reset = () => {
    setState({
      message: "",
      signedData: null,
    });
  };

  return [
    state,
    { setMessage, handleSign, reset }
  ];
};