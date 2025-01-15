import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LaserEyesProvider, MAINNET } from "@omnisat/lasereyes";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <LaserEyesProvider config={{ network: MAINNET }}>
        <App />
      </LaserEyesProvider>
    </ThemeProvider>
  </StrictMode>
);
