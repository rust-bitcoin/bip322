export { viteIsSSR };
export { viteIsSSR_options };
declare function viteIsSSR(config: {
    build?: {
        ssr?: boolean | string;
    };
}): boolean;
type Options = undefined | boolean | {
    ssr?: boolean;
};
declare function viteIsSSR_options(options: Options): boolean;
