export { assertOnBeforeRenderHookReturn };
declare function assertOnBeforeRenderHookReturn<Keys extends readonly string[]>(hookReturnValue: unknown, hookFilePath: string): asserts hookReturnValue is undefined | null | {
    [key in Keys[number]]?: unknown;
};
