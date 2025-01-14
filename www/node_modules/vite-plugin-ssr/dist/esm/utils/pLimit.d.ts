export { pLimit };
export type PLimit = (job: () => Promise<void>) => Promise<undefined> & {
    __stamp?: Symbol;
};
declare function pLimit(concurrency: number): PLimit;
export default class Queue {
    #private;
    constructor();
    enqueue(value: any): void;
    dequeue(): any;
    clear(): void;
    get size(): any;
    [Symbol.iterator](): Generator<any, void, unknown>;
}
