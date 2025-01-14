import { useEffect, useState } from "react";
import { useLaserEyes, XVERSE } from "@omnisat/lasereyes";
import init, { verify } from "./bip322.js";
import VerifyForm from "./components/VerifyForm";
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

  const [verifyFormData, setVerifyFormData] = useState<VerifyFormData>(
    defaultVerifyFormData
  );

  const { connect, address, signMessage } = useLaserEyes();

  useEffect(() => {
    init()
      .then(() => setWasmInitialized(true))
      .catch((error) => console.error("Failed to initialize WASM:", error));
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

  const handleSign = async () => {
    try {
      const connectedWallet = await connect(XVERSE);
      console.log(connectedWallet);
      const signature = await signMessage(verifyFormData.message);

      setVerifyFormData((prev) => ({
        ...prev,
        signature,
        address,
      }));
    } catch (error) {
      console.error("Signing failed:", error);
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

  const handleReset = () => {
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
        <div className="button-container">
          <button
            className="sign-button"
            onClick={() => {
              handleSign();
            }}
          >
            sign
          </button>
          <span className="button-separator">/</span>
          {!isVerifyFormVisible && !verificationResult && (
            <button
              className="verify-button"
              onClick={() => setIsVerifyFormVisible(true)}
            >
              verify
            </button>
          )}
        </div>

        {isVerifyFormVisible && (
          <VerifyForm
            formData={verifyFormData}
            verificationResult={verificationResult}
            onSubmit={handleVerification}
            onInputChange={handleVerifyFormChange}
            onInputFocus={handleInputFocus}
            onInputBlur={handleVerifyFormBlur}
            onReset={handleReset}
          />
        )}
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
