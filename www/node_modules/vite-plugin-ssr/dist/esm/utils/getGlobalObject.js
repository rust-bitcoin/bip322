export function getGlobalObject(
// We use the filename as key; each `getGlobalObject()` call should live in a unique filename.
key, defaultValue) {
    const allGlobalObjects = (globalThis.__vite_plugin_ssr = globalThis.__vite_plugin_ssr || {});
    const globalObject = (allGlobalObjects[key] = allGlobalObjects[key] || defaultValue);
    return globalObject;
}
