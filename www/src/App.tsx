import { useEffect, useState } from "react";
import { useLaserEyes, UNISAT, XVERSE } from "@omnisat/lasereyes";
import init, { verify } from "./bip322.js";
import "./index.css";

interface FormData {
  address: string;
  message: string;
  signature: string;
}

function App() {
  // WASM initialization state
  const [isWasmInitialized, setWasmInitialized] = useState(false);

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<FormData>({
    address: "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3",
    message: "Hello World",
    signature:
      "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ==",
  });

  // Get LaserEyes wallet functionality
  const { connect, address, signMessage, hasUnisat } = useLaserEyes();

  // Initialize WASM
  useEffect(() => {
    init()
      .then(() => setWasmInitialized(true))
      .catch((error) => {
        console.error("Failed to initialize WASM:", error);
      });
  }, []);

  // Handle signature verification
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWasmInitialized) {
      console.error("WASM not initialized yet");
      return;
    }
    try {
      const result = verify(
        formData.address,
        formData.message,
        formData.signature
      );
      setVerificationResult(result.toString());
      document.getElementById("verify-form")?.classList.remove("visible");
      setShowForm(false);
    } catch (error) {
      console.error("Verification failed:", error);
      setVerificationResult("Verification failed");
    }
  };

  // Handle connecting a wallet and signing
  const handleSign = async () => {
    let signature = "";
    try {
      const connectedWallet = await connect(XVERSE);
      console.log(connectedWallet);
      signature = await signMessage(formData.message);
      setFormData((prev) => ({
        ...prev,
        signature,
        address,
      }));
    } catch (error) {
      console.error("Signing failed:", error);
    } finally {
      console.log(signature);
    }
  };

  // Input handlers
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const defaultValue = e.target.getAttribute("data-default");
    if (e.target.value === defaultValue) {
      e.target.value = "";
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      const defaultValue = e.target.getAttribute("data-default") || "";
      e.target.value = defaultValue;
      setFormData((prev) => ({
        ...prev,
        [e.target.id]: defaultValue,
      }));
    }
  };

  const showVerifyForm = () => {
    document.getElementById("navbar")?.classList.add("hidden");
    document.getElementById("bip")?.classList.add("hidden");
    document.getElementById("verify-form")?.classList.add("visible");
    setShowForm(true);
  };

  if (!isWasmInitialized) {
    return <div>Loading WASM...</div>;
  }

  return (
    <>
      <div id="verify">
        <div id="bip" onClick={showVerifyForm}></div>
        <div className="wallet-section">
          <div className="wallet-info">
            <button className="sign-button" onClick={handleSign}>
              Sign Current Message
            </button>
          </div>
        </div>
        <form id="verify-form" onSubmit={handleVerification}>
          <input
            type="text"
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, address: e.target.value }))
            }
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            data-default={formData.address}
            required
          />
          <input
            type="text"
            id="message"
            value={formData.message}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            data-default={formData.message}
            required
          />
          <input
            type="text"
            id="signature"
            value={formData.signature}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, signature: e.target.value }))
            }
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            data-default={formData.signature}
            required
          />
          <button type="submit" id="verify-button">
            verify
          </button>
        </form>
        {verificationResult && <div>{verificationResult}</div>}
      </div>
      <nav className="navbar" id="navbar">
        <a href="https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki">
          bip
        </a>
        <a href="https://github.com/rust-bitcoin/bip322">github</a>
        <a href="https://crates.io/crates/bip322">crate</a>
      </nav>
    </>
  );
}

export default App;
