import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LaserEyesProvider, MAINNET } from "@omnisat/lasereyes";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LaserEyesProvider config={{ network: MAINNET }}>
      <App />
    </LaserEyesProvider>
  </StrictMode>
);
