export { objectAssign };
declare function objectAssign<Obj extends object, ObjAddendum>(obj: Obj, objAddendum: ObjAddendum): asserts obj is Obj & ObjAddendum;
