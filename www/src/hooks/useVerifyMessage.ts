import { useState } from 'react';
import { verify } from "@/bip322.js";

export interface VerifyFormState {
  address: string;
  message: string;
  signature: string;
  verificationResult: string | null;
}

interface VerifyMessageActions {
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleVerify: (e: React.FormEvent) => void;
  reset: () => void;
}

export const useVerifyMessage = (): [VerifyFormState, VerifyMessageActions] => {
  const [state, setState] = useState<VerifyFormState>({
    address: "",
    message: "",
    signature: "",
    verificationResult: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setState(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = verify(state.address, state.message, state.signature);
      setState(prev => ({
        ...prev,
        verificationResult: result.toString(),
      }));
    } catch (error) {
      console.error("Verification failed:", error);
      setState(prev => ({
        ...prev,
        verificationResult: "Verification failed",
      }));
    }
  };

  const reset = () => {
    setState({
      address: "",
      message: "",
      signature: "",
      verificationResult: null,
    });
  };

  return [
    state,
    { handleChange, handleVerify, reset }
  ];
};