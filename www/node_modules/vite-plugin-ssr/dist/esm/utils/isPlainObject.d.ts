export { isPlainObject };
type PlainObject = Record<string, unknown>;
declare function isPlainObject(value: unknown): value is PlainObject;
