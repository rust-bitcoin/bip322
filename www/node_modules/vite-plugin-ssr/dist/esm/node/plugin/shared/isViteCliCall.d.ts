export { isViteCliCall };
export { getViteConfigFromCli };
declare function isViteCliCall(): boolean;
type ConfigFromCli = {
    root: undefined | string;
    configFile: undefined | string;
} & Record<string, unknown> & {
    build: Record<string, unknown>;
};
declare function getViteConfigFromCli(): null | ConfigFromCli;
