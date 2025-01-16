// const defaultVerifyFormData = {
//   address: "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3",
//   message: "Hello World",
//   signature:
//     "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ==",
// };

import { useEffect, useState } from "react";
import {
  useLaserEyes,
  UNISAT,
  MAGIC_EDEN,
  OYL,
  ORANGE,
  PHANTOM,
  LEATHER,
  XVERSE,
  WIZZ,
  OKX,
} from "@omnisat/lasereyes";
import init, { verify } from "@/bip322.js";
import VerifyForm from "@/components/VerifyForm";
import ConnectWalletForm from "@/components/ConnectWallet";
import SignMessageForm from "@/components/SignMessage";
import "@/index.css";
import { Button } from "@/components/ui/button";

export interface SignMessageState {
  message: string;
  signedData: {
    address: string;
    message: string;
    signature: string;
  } | null;
}

export interface VerifyFormState {
  address: string;
  message: string;
  signature: string;
  verificationResult: string | null;
}

function App() {
  const [isWasmInitialized, setWasmInitialized] = useState(false);

  const [isSignFormVisible, setIsSignFormVisible] = useState(false);
  const [isVerifyFormVisible, setIsVerifyFormVisible] = useState(false);

  const [signMessageState, setSignMessageState] = useState<SignMessageState>({
    message: "",
    signedData: null,
  });

  const [verifyFormState, setVerifyFormState] = useState<VerifyFormState>({
    address: "",
    message: "",
    signature: "",
    verificationResult: null,
  });

  const {
    connect,
    disconnect,
    address,
    provider,
    hasUnisat,
    hasXverse,
    hasOyl,
    hasMagicEden,
    hasOkx,
    hasLeather,
    hasPhantom,
    hasWizz,
    hasOrange,
    connected,
    signMessage,
  } = useLaserEyes();

  const hasWallet = {
    unisat: hasUnisat,
    xverse: hasXverse,
    oyl: hasOyl,
    [MAGIC_EDEN]: hasMagicEden,
    okx: hasOkx,
    leather: hasLeather,
    phantom: hasPhantom,
    wizz: hasWizz,
    orange: hasOrange,
  };

  const handleConnect = async (
    walletName:
      | typeof UNISAT
      | typeof MAGIC_EDEN
      | typeof OYL
      | typeof ORANGE
      | typeof PHANTOM
      | typeof LEATHER
      | typeof XVERSE
      | typeof WIZZ
      | typeof OKX
  ) => {
    if (provider === walletName) {
      await disconnect();
    } else {
      await connect(walletName as never);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      resetSignMessageForm();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const handleMessageSign = async () => {
    if (!connected || !signMessageState.message) return;

    try {
      const signature = await signMessage(signMessageState.message);
      const newSignedData = {
        address: address,
        message: signMessageState.message,
        signature,
      };

      setSignMessageState((prev) => ({
        ...prev,
        signedData: newSignedData,
      }));
    } catch (error) {
      console.error("Failed to sign message:", error);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWasmInitialized) {
      console.error("WASM not initialized yet");
      return;
    }

    try {
      const result = verify(
        verifyFormState.address,
        verifyFormState.message,
        verifyFormState.signature
      );
      setVerifyFormState((prev) => ({
        ...prev,
        verificationResult: result.toString(),
      }));
    } catch (error) {
      console.error("Verification failed:", error);
      setVerifyFormState((prev) => ({
        ...prev,
        verificationResult: "Verification failed",
      }));
    }
  };

  const handleVerifyFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerifyFormState((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const resetSignMessageForm = () => {
    setSignMessageState({
      message: "",
      signedData: null,
    });
  };

  const resetVerifyForm = () => {
    setVerifyFormState({
      address: "",
      message: "",
      signature: "",
      verificationResult: null,
    });
  };

  useEffect(() => {
    init()
      .then(() => setWasmInitialized(true))
      .catch((error) => console.error("Failed to initialize WASM:", error));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (connected) {
        await disconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [connected, disconnect]);

  if (!isWasmInitialized) {
    return <div>Loading WASM...</div>;
  }

  return (
    <div className="app-container">
      <header className="hero">
        <h1 onClick={() => window.location.reload()}>bip322</h1>
      </header>

      <section className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center">
        <div className="w-full">
          {!isSignFormVisible ? (
            <Button
              className="sign-button h-auto w-full leading-relaxed text-[length:var(--font-large)] md:text-[length:var(--font-large)]"
              variant="outline"
              onClick={() => setIsSignFormVisible(true)}
            >
              sign
            </Button>
          ) : connected && address ? (
            <SignMessageForm
              address={address}
              message={signMessageState.message}
              signedData={signMessageState.signedData}
              onMessageChange={(message) =>
                setSignMessageState((prev) => ({ ...prev, message }))
              }
              onSign={handleMessageSign}
              onReset={resetSignMessageForm}
              onBack={handleDisconnect}
            />
          ) : (
            <ConnectWalletForm
              provider={provider}
              hasWallet={hasWallet}
              onConnect={handleConnect}
              onDisconnect={() => {
                handleDisconnect();
                setIsSignFormVisible(false);
              }}
            />
          )}
        </div>

        <span className="button-separator text-[length:var(--font-large)] md:text-[length:var(--font-large)] cursor-default mx-4">
          /
        </span>

        <div className="w-full">
          {!isVerifyFormVisible ? (
            <Button
              className="verify-button h-auto w-full leading-relaxed text-[length:var(--font-large)] md:text-[length:var(--font-large)]"
              variant="outline"
              onClick={() => setIsVerifyFormVisible(true)}
            >
              verify
            </Button>
          ) : (
            <VerifyForm
              formData={verifyFormState}
              verificationResult={verifyFormState.verificationResult}
              onSubmit={handleVerification}
              onInputChange={handleVerifyFormChange}
              onReset={resetVerifyForm}
              onBack={() => setIsVerifyFormVisible(false)}
            />
          )}
        </div>
      </section>

      <nav className="flex justify-evenly items-center absolute inset-x-0 bottom-0 p-8">
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-x-small)]"
        >
          <a href="https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki">
            bip
          </a>
        </Button>
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-x-small)]"
        >
          <a href="https://github.com/rust-bitcoin/bip322">github</a>
        </Button>
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-x-small)]"
        >
          <a href="https://crates.io/crates/bip322">crate</a>
        </Button>
      </nav>
    </div>
  );
}

export default App;
