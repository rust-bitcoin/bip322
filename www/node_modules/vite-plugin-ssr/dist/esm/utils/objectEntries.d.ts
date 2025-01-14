export { objectEntries };
type ValueOf<T> = T[keyof T];
type Entries<T> = [keyof T, ValueOf<T>][];
declare function objectEntries<T extends object>(obj: T): Entries<T>;
