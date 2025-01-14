export { autoRetry };
declare function autoRetry(fn: () => void | Promise<void>, timeout: number): Promise<void>;
