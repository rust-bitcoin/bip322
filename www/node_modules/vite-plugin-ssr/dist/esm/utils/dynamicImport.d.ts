/** Only works for npm packages, for files use @brillout/import instead */
export declare function dynamicImport<Mod = never>(mod: string): Promise<Mod>;
