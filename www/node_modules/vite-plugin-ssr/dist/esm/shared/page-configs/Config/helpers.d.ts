export type { IsNotEmpty };
export type { XOR4 };
export type { Combine };
type IsNotEmpty<T> = Not<IsEmpty<T>>;
type IsEmpty<T> = keyof T extends never ? true : false;
type Combine<T1, T2> = {
    [K in keyof T1 | keyof T2]?: (K extends keyof T1 ? T1[K] : never) | (K extends keyof T2 ? T2[K] : never);
};
type XOR4<T1 extends boolean, T2 extends boolean, T3 extends boolean, T4 extends boolean> = (T1 extends true ? T2 extends true ? false : T3 extends true ? false : Not<T4> : T2 extends true ? T3 extends true ? false : Not<T4> : T3 extends true ? Not<T4> : T4);
type Not<T extends boolean> = T extends true ? false : true;
