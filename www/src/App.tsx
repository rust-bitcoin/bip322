import { useState, useEffect } from "react";
import { useLaserEyes, MAGIC_EDEN, ProviderType } from "@omnisat/lasereyes";
import init, { verify } from "@/bip322.js";
import VerifyForm from "@/components/VerifyForm";
import ConnectWalletForm from "@/components/ConnectWallet";
import SignMessageForm from "@/components/SignMessage";
import AnimatedContainer from "@/components/AnimatedContainer";
import { BaseButton } from "@/components/ui/base-button";

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

  const handleConnect = async (walletName: ProviderType) => {
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
    <div className="min-h-screen w-full flex flex-col justify-center">
      <header className="hero h-[calc(var(--size)*0.50)] flex justify-center w-full">
        <div className="w-[95%] md:w-[80vw] mx-auto">
          <h1 onClick={() => window.location.reload()}>bip322</h1>
        </div>
      </header>

      <main className="w-full">
        <div className="w-[95%] md:w-[65vw] mx-auto">
          <div className="flex flex-col lg:flex-row gap-[calc(var(--size)*0.1)] min-h-[50vh] items-center">
            <div className="flex-1 w-full flex items-center">
              <AnimatedContainer isExpanded={isSignFormVisible}>
                <div className="w-full">
                  {connected && address ? (
                    <SignMessageForm
                      address={address}
                      message={signMessageState.message}
                      signedData={signMessageState.signedData}
                      onMessageChange={(message) =>
                        setSignMessageState((prev) => ({
                          ...prev,
                          message,
                        }))
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
                <BaseButton
                  variant="large"
                  onClick={() => setIsSignFormVisible(true)}
                >
                  sign
                </BaseButton>
              </AnimatedContainer>
            </div>

            <div className="flex-1 w-full flex items-center">
              <AnimatedContainer isExpanded={isVerifyFormVisible}>
                <div className="w-full">
                  <VerifyForm
                    formData={verifyFormState}
                    verificationResult={verifyFormState.verificationResult}
                    onSubmit={handleVerification}
                    onInputChange={handleVerifyFormChange}
                    onReset={resetVerifyForm}
                    onBack={() => setIsVerifyFormVisible(false)}
                  />
                </div>
                <BaseButton
                  variant="large"
                  onClick={() => setIsVerifyFormVisible(true)}
                >
                  verify
                </BaseButton>
              </AnimatedContainer>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex h-[calc(var(--size)*0.40)] items-center w-full">
        <nav className="w-[95%] md:w-[80%] mx-auto">
          <div className="flex justify-between gap-4 lg:gap-8">
            <BaseButton variant="nav" asChild>
              <a href="https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki">
                bip
              </a>
            </BaseButton>
            <BaseButton variant="nav" asChild>
              <a href="https://github.com/rust-bitcoin/bip322">github</a>
            </BaseButton>
            <BaseButton variant="nav" asChild>
              <a href="https://crates.io/crates/bip322">crate</a>
            </BaseButton>
          </div>
        </nav>
      </footer>
    </div>
  );
}

export default App;
