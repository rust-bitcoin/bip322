import { useState, useEffect } from "react";
import init from "@/bip322.js";

interface UseWasmInitReturn {
  isWasmInitialized: boolean;
  wasmError: Error | null;
}

export const useWasmInit = (): UseWasmInitReturn => {
  const [isWasmInitialized, setIsWasmInitialized] = useState(false);
  const [wasmError, setWasmError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeWasm = async () => {
      try {
        await init();
        setIsWasmInitialized(true);
      } catch (err) {
        console.error("Failed to initialize WASM:", err);
        setWasmError(err instanceof Error ? err : new Error("Failed to initialize WASM"));
      }
    };

    initializeWasm();
  }, []);

  return { isWasmInitialized, wasmError };
};