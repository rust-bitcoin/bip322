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
  PHANTOM,
  LEATHER,
  XVERSE,
  OKX,
} from "@omnisat/lasereyes";
import init, { verify } from "@/bip322.js";
import VerifyForm from "@/components/VerifyForm";
import ConnectWalletForm from "@/components/ConnectWallet";
import SignMessageForm from "@/components/SignMessage";
import "@/index.css";
import { Button } from "@/components/ui/button";
import AnimatedContainer from "./components/AnimatedContainer";

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
  };

  const handleConnect = async (
    walletName:
      | typeof UNISAT
      | typeof MAGIC_EDEN
      | typeof OYL
      | typeof PHANTOM
      | typeof LEATHER
      | typeof XVERSE
      | typeof OKX
  ) => {
    if (provider === walletName) {
      disconnect();
    } else {
      await connect(walletName as never);
    }
  };

  const handleDisconnect = async () => {
    try {
      disconnect();
      resetSignMessageForm();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const handleMessageSign = async () => {
    if (!connected || !signMessageState.message) return;

    try {
      const signature = await signMessage(signMessageState.message, address);
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
        disconnect();
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

      <section className="grid grid-cols-2 gap-12 items-center">
        <AnimatedContainer isExpanded={isSignFormVisible}>
          <div
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
              !isSignFormVisible
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
          >
            {connected && address ? (
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
          <Button
            className={`
            h-[calc(var(--font-large)+3rem)] w-full
            text-[length:var(--font-md)] 
            md:text-[length:var(--font-md)]
            bg-[hsl(var(--light-1))] text-[hsl(var(--dark-1))]
            [box-shadow:0_0_7px_#fff]
            hover:bg-[hsl(var(--light-2))]
            hover:text-[hsl(var(--dark-1))]
            hover:[box-shadow:0_0_15px_3px_#fff]
            rounded-xl
            transition-all duration-300
            [text-shadow:0_0_4px_rgba(0,0,0,0.3),0_0_8px_rgba(0,0,0,0.2),0_0_12px_rgba(0,0,0,0.1)]
            hover:[text-shadow:0_0_6px_rgba(0,0,0,0.4),0_0_12px_rgba(0,0,0,0.3),0_0_18px_rgba(0,0,0,0.2)]
              ${
                isSignFormVisible
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100"
              }
            `}
            variant="ghost"
            onClick={() => setIsSignFormVisible(true)}
          >
            sign
          </Button>
        </AnimatedContainer>

        <AnimatedContainer isExpanded={isVerifyFormVisible}>
          <div
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
              !isVerifyFormVisible
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
          >
            <VerifyForm
              formData={verifyFormState}
              verificationResult={verifyFormState.verificationResult}
              onSubmit={handleVerification}
              onInputChange={handleVerifyFormChange}
              onReset={resetVerifyForm}
              onBack={() => setIsVerifyFormVisible(false)}
            />
          </div>
          <Button
            className={`
            h-[calc(var(--font-large)+3rem)] w-full
            text-[length:var(--font-md)] 
            md:text-[length:var(--font-md)]
            bg-[hsl(var(--light-1))] text-[hsl(var(--dark-1))]
            [box-shadow:0_0_10px_#fff]
            hover:bg-[hsl(var(--light-2))]
            hover:text-[hsl(var(--dark-1))]
            hover:[box-shadow:0_0_20px_3px_#fff]
            rounded-xl
            transition-all duration-300
            [text-shadow:0_0_4px_rgba(0,0,0,0.3),0_0_8px_rgba(0,0,0,0.2),0_0_12px_rgba(0,0,0,0.1)]
            hover:[text-shadow:0_0_6px_rgba(0,0,0,0.4),0_0_12px_rgba(0,0,0,0.3),0_0_18px_rgba(0,0,0,0.2)]
              ${
                isVerifyFormVisible
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100"
              }
            `}
            variant="ghost"
            onClick={() => setIsVerifyFormVisible(true)}
          >
            verify
          </Button>
        </AnimatedContainer>
      </section>

      <nav className="flex justify-between items-center absolute inset-x-0 bottom-28 py-18 mb-20">
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-small)]"
        >
          <a href="https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki">
            bip
          </a>
        </Button>
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-small)]"
        >
          <a href="https://github.com/rust-bitcoin/bip322">github</a>
        </Button>
        <Button
          asChild
          variant="link"
          className="text-[length:var(--font-small)]"
        >
          <a href="https://crates.io/crates/bip322">crate</a>
        </Button>
      </nav>
    </div>
  );
}

export default App;
