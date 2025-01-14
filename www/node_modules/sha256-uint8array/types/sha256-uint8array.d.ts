/**
 * https://github.com/kawanet/sha256-uint8array
 */

export declare function createHash(algorithm?: string): Hash;

declare class Hash {
    update(data: string, encoding?: string): this;
    update(data: Uint8Array): this;
    update(data: ArrayBufferView): this;

    digest(): Uint8Array;
    digest(encoding: string): string;
}
