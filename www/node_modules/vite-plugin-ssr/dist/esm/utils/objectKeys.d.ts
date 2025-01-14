/** Same as Object.keys() but with type inference */
export declare function objectKeys<T extends Record<string, unknown>>(obj: T): Array<keyof T>;
