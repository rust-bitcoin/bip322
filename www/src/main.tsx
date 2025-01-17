import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LaserEyesProvider, MAINNET } from "@omnisat/lasereyes";
import "./index.css";
import App from "./App.tsx";

document.documentElement.classList.add("dark");
const root = document.getElementById("root")!;
root.classList.add("dark");

createRoot(root).render(
  <StrictMode>
    <LaserEyesProvider config={{ network: MAINNET }}>
      <App />
    </LaserEyesProvider>
  </StrictMode>
);

