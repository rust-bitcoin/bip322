import { Colors } from "./types"

declare const pc: Colors & { createColors: (enabled?: boolean) => Colors }

export = pc
