export declare function checkType<Type>(_: Type): void;
export declare function castType<Cast, Type = {}>(_: Type): asserts _ is Type & Cast;
