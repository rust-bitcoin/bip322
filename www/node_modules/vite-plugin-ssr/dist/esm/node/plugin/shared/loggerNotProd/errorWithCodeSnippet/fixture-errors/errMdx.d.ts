export declare const errMdx: {
    name: string;
    message: string;
    reason: string;
    line: number;
    column: number;
    position: {
        start: {
            line: number;
            column: number;
            offset: number;
            _index: number;
            _bufferIndex: number;
        };
        end: {
            line: number;
            column: number;
            offset: number;
            _index: number;
            _bufferIndex: number;
        };
    };
    source: string;
    ruleId: string;
    plugin: string;
    id: string;
    pluginCode: string;
    loc: {
        file: string;
        start: {
            line: number;
            column: number;
            offset: number;
            _index: number;
            _bufferIndex: number;
        };
        end: {
            line: number;
            column: number;
            offset: number;
            _index: number;
            _bufferIndex: number;
        };
    };
    frame: string;
    stack: string;
};
