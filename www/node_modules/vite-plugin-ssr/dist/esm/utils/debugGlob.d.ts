export declare const debugGlob: ((...msgs: unknown[]) => void) & {
    options: (options: {
        serialization?: {
            emptyArray?: string | undefined;
        } | undefined;
    }) => (...msgs: unknown[]) => void;
    isEnabled: boolean;
};
