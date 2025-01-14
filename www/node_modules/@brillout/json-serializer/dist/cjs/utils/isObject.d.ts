export { isObject };
type Object = Record<string, unknown>;
declare function isObject(value: unknown): value is Object;
