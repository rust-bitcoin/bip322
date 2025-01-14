export { higherFirst };
export { lowerFirst };
export { makeFirst };
export { makeLast };
declare function higherFirst<T>(getValue: (element: T) => number): (element1: T, element2: T) => 0 | 1 | -1;
declare function lowerFirst<T>(getValue: (element: T) => number): (element1: T, element2: T) => 0 | 1 | -1;
declare function makeFirst<T>(getValue: (element: T) => boolean | null): (element1: T, element2: T) => 0 | 1 | -1;
declare function makeLast<T>(getValue: (element: T) => boolean | null): (element1: T, element2: T) => 0 | 1 | -1;
