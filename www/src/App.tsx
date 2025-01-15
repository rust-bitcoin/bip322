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
import init, { verify } from "./bip322.js";
import VerifyForm from "./components/VerifyForm";
import ConnectWalletForm from "./components/ConnectWallet";
import SignMessageForm, {
  SignedMessageDisplay,
} from "./components/SignMessage";
import "./index.css";

interface VerifyFormData {
  address: string;
  message: string;
  signature: string;
}

const defaultVerifyFormData = {
  address: "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3",
  message: "Hello World",
  signature:
    "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ==",
};

function App() {
  const [isWasmInitialized, setWasmInitialized] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(
    null
  );
  const [isVerifyFormVisible, setIsVerifyFormVisible] = useState(false);
  const [isConnectWalletVisible, setIsConnectWalletVisible] = useState(false);
  const [verifyFormData, setVerifyFormData] = useState<VerifyFormData>(
    defaultVerifyFormData
  );
  const [messageToSign, setMessageToSign] = useState("");
  const [signedData, setSignedData] = useState<VerifyFormData | null>(null);

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
    isConnecting,
    signMessage,
  } = useLaserEyes();

  // check if any wallet connected
  useEffect(() => {
    if (connected && !isConnecting) {
      console.log("is connected: ", address, hasUnisat, hasXverse);
    } else {
      console.log("not connected ", address, hasUnisat, hasXverse);
    }
  }, [connect, isConnecting, address]);

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
      setIsConnectWalletVisible(false);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const handleMessageSign = async () => {
    if (!connected || !messageToSign) return;

    try {
      const signature = await signMessage(messageToSign);
      const newSignedData = {
        address: address,
        message: messageToSign,
        signature,
      };
      setSignedData(newSignedData);
      setVerifyFormData(newSignedData);
      setIsVerifyFormVisible(true);
    } catch (error) {
      console.error("Failed to sign message:", error);
    }
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

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWasmInitialized) {
      console.error("WASM not initialized yet");
      return;
    }
    try {
      const result = verify(
        verifyFormData.address,
        verifyFormData.message,
        verifyFormData.signature
      );
      setVerificationResult(result.toString());
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const handleVerifyFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerifyFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const defaultValue = e.target.getAttribute("data-default");
    if (e.target.value === defaultValue) {
      e.target.value = "";
    }
  };

  const handleVerifyFormBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      const defaultValue = e.target.getAttribute("data-default") || "";
      e.target.value = defaultValue;
      setVerifyFormData((prev) => ({
        ...prev,
        [e.target.id]: defaultValue,
      }));
    }
  };

  const handleSignedMessageFormReset = () => {
    // return to sign message form
    setSignedData(null);
    setMessageToSign("");
  };

  const handleSignMessageFormReset = async () => {
    // return to connect wallet form
    await disconnect();
    setMessageToSign("");
  };

  const handleVerificationFormReset = () => {
    setVerificationResult(null);
    setVerifyFormData(defaultVerifyFormData);
  };

  if (!isWasmInitialized) {
    return <div>Loading WASM...</div>;
  }

  return (
    <div className="app-container">
      <header className="hero">
        <h1 onClick={() => window.location.reload()}>bip322</h1>
      </header>

      <section className="action-section">
        <div className="form-section">
          {!isConnectWalletVisible ? (
            <button
              className="sign-button"
              onClick={() => setIsConnectWalletVisible(true)}
            >
              sign
            </button>
          ) : connected && address ? (
            signedData ? (
              <SignedMessageDisplay
                address={signedData.address}
                message={signedData.message}
                signature={signedData.signature}
                onReset={handleSignedMessageFormReset}
              />
            ) : (
              <SignMessageForm
                address={address}
                message={messageToSign}
                onMessageChange={setMessageToSign}
                onSign={handleMessageSign}
                onReset={handleSignMessageFormReset}
              />
            )
          ) : (
            <ConnectWalletForm
              address={address}
              provider={provider}
              hasWallet={hasWallet}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          )}
        </div>

        <span className="button-separator">/</span>

        <div className="form-section">
          {!isVerifyFormVisible ? (
            <button
              className="verify-button"
              onClick={() => setIsVerifyFormVisible(true)}
            >
              verify
            </button>
          ) : (
            <VerifyForm
              formData={verifyFormData}
              verificationResult={verificationResult}
              onSubmit={handleVerification}
              onInputChange={handleVerifyFormChange}
              onInputFocus={handleInputFocus}
              onInputBlur={handleVerifyFormBlur}
              onReset={handleVerificationFormReset}
            />
          )}
          {/* </div> */}
        </div>
      </section>

      <nav className="navbar">
        <a href="https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki">
          bip
        </a>
        <a href="https://github.com/rust-bitcoin/bip322">github</a>
        <a href="https://crates.io/crates/bip322">crate</a>
      </nav>
    </div>
  );
}

export default App;
