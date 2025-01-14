// Prevent XSS attacks, see https://github.com/brillout/vite-plugin-ssr/pull/181#issuecomment-952846026
export { sanitizeJson };
function sanitizeJson(unsafe) {
    const safe = unsafe.replace(/</g, '\\u003c');
    return safe;
}
