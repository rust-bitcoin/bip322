/** Only works for npm packages, for files use @brillout/import instead */
export function dynamicImport(mod) {
    return new Function('mod', 'return import(mod)')(mod);
}
