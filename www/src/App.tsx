import { useEffect } from "react";
import VerifyForm from "@/components/VerifyForm";
import SignMessageForm from "@/components/SignMessage";
import { BaseButton } from "@/components/ui/base-button";
import { useWasmInit } from "@/hooks/useWasmInit";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useSignMessage } from "@/hooks/useSignMessage";
import { useVerifyMessage } from "@/hooks/useVerifyMessage";

function App() {
  const { wasmError } = useWasmInit();
  const [walletState, walletActions] = useWalletConnection();
  const [signState, signActions] = useSignMessage();
  const [verifyState, verifyActions] = useVerifyMessage();

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (walletState.isConnected) {
        walletActions.handleDisconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [walletState.isConnected, walletActions]);

  if (wasmError) {
    return <div>Failed to initialize WASM: {wasmError.message}</div>;
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
          <div className="flex flex-col lg:flex-row gap-[calc(var(--size)*0.2)] lg:gap-[calc(var(--size)*0.1)] min-h-[50vh] items-center">
            <div className="flex-1 w-full flex justify-center items-end lg:items-center">
              <SignMessageForm
                message={signState.message}
                signedData={signState.signedData}
                onMessageChange={signActions.setMessage}
                onSign={() =>
                  signActions.handleSign(
                    walletState.address!,
                    walletActions.signMessage
                  )
                }
                onReset={signActions.reset}
              />
            </div>

            <div className="flex-1 w-full flex justify-center items-start lg:items-center">
              <VerifyForm
                formData={verifyState}
                verificationResult={verifyState.verificationResult}
                onSubmit={verifyActions.handleVerify}
                onInputChange={verifyActions.handleChange}
                onReset={verifyActions.reset}
              />
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
