export declare const errEsbuild: {
    errors: {
        id: string;
        location: {
            column: number;
            file: string;
            length: number;
            line: number;
            lineText: string;
            namespace: string;
            suggestion: string;
        };
        notes: never[];
        pluginName: string;
        text: string;
    }[];
    warnings: never[];
    frame: string;
    loc: {
        column: number;
        file: string;
        length: number;
        line: number;
        lineText: string;
        namespace: string;
        suggestion: string;
    };
    plugin: string;
    id: string;
    pluginCode: string;
    message: string;
    stack: string;
};
