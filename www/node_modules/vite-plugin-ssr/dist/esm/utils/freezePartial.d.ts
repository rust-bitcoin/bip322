export { freezePartial };
declare function freezePartial(obj: Record<string, unknown>, allowList: Record<string, (val: unknown) => boolean>): void;
