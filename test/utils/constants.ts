export const SENTINEL_MODULES = "0x0000000000000000000000000000000000000001";

export enum ModuleType {
    Plugin,
    Hooks,
    FunctionHandler,
}

export enum ExecutionType {
    MultiSignature,
    Module,
}
