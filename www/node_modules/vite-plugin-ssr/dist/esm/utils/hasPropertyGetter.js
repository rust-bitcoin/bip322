export function hasPropertyGetter(obj, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    return !!descriptor && !('value' in descriptor) && !!descriptor.get;
}
