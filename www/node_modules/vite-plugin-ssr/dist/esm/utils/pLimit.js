/* Copied from https://github.com/sindresorhus/p-limit */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Queue_head, _Queue_tail, _Queue_size;
export { pLimit };
function pLimit(concurrency) {
    if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
        throw new TypeError('Expected concurrency to be a number from 1 and up');
    }
    const queue = new Queue();
    let activeCount = 0;
    const next = () => {
        activeCount--;
        if (queue.size > 0) {
            queue.dequeue()();
        }
    };
    // @ts-ignore
    const run = async (fn, resolve, args) => {
        activeCount++;
        const result = (async () => fn(...args))();
        resolve(result);
        try {
            await result;
        }
        catch { }
        next();
    };
    // @ts-ignore
    const enqueue = (fn, resolve, args) => {
        queue.enqueue(run.bind(undefined, fn, resolve, args));
        (async () => {
            // This function needs to wait until the next microtask before comparing
            // `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
            // when the run function is dequeued and called. The comparison in the if-statement
            // needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
            await Promise.resolve();
            if (activeCount < concurrency && queue.size > 0) {
                queue.dequeue()();
            }
        })();
    };
    // @ts-ignore
    const generator = (fn, ...args) => new Promise((resolve) => {
        enqueue(fn, resolve, args);
    });
    Object.defineProperties(generator, {
        activeCount: {
            get: () => activeCount
        },
        pendingCount: {
            get: () => queue.size
        },
        clearQueue: {
            value: () => {
                queue.clear();
            }
        }
    });
    // @ts-ignore
    return generator;
}
/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/
class Node {
    // @ts-ignore
    constructor(value) {
        this.value = value;
    }
}
export default class Queue {
    constructor() {
        // @ts-ignore
        _Queue_head.set(this, void 0);
        // @ts-ignore
        _Queue_tail.set(this, void 0);
        // @ts-ignore
        _Queue_size.set(this, void 0);
        this.clear();
    }
    // @ts-ignore
    enqueue(value) {
        var _a;
        const node = new Node(value);
        if (__classPrivateFieldGet(this, _Queue_head, "f")) {
            __classPrivateFieldGet(this, _Queue_tail, "f").next = node;
            __classPrivateFieldSet(this, _Queue_tail, node, "f");
        }
        else {
            __classPrivateFieldSet(this, _Queue_head, node, "f");
            __classPrivateFieldSet(this, _Queue_tail, node, "f");
        }
        __classPrivateFieldSet(this, _Queue_size, (_a = __classPrivateFieldGet(this, _Queue_size, "f"), _a++, _a), "f");
    }
    dequeue() {
        var _a;
        const current = __classPrivateFieldGet(this, _Queue_head, "f");
        if (!current) {
            return;
        }
        __classPrivateFieldSet(this, _Queue_head, __classPrivateFieldGet(this, _Queue_head, "f").next, "f");
        __classPrivateFieldSet(this, _Queue_size, (_a = __classPrivateFieldGet(this, _Queue_size, "f"), _a--, _a), "f");
        return current.value;
    }
    clear() {
        __classPrivateFieldSet(this, _Queue_head, undefined, "f");
        __classPrivateFieldSet(this, _Queue_tail, undefined, "f");
        __classPrivateFieldSet(this, _Queue_size, 0, "f");
    }
    get size() {
        return __classPrivateFieldGet(this, _Queue_size, "f");
    }
    *[(_Queue_head = new WeakMap(), _Queue_tail = new WeakMap(), _Queue_size = new WeakMap(), Symbol.iterator)]() {
        let current = __classPrivateFieldGet(this, _Queue_head, "f");
        while (current) {
            yield current.value;
            current = current.next;
        }
    }
}
