export { debugLogsRuntimePre };
export { debugLogsRuntimePost };
export { debugLogsBuildtime };
import type { AutoImporter } from '../loadServerBuild/AutoImporter';
declare function debugLogsRuntimePre(autoImporter: AutoImporter): undefined | void;
declare function debugLogsRuntimePost({ success, requireError, outDir, isOutsideOfCwd }: {
    success: boolean;
    requireError: unknown;
    outDir: undefined | string;
    isOutsideOfCwd: null | boolean;
}): undefined | void;
declare function debugLogsBuildtime({ disabled, paths }: {
    disabled: true;
    paths: null;
} | {
    disabled: false;
    paths: Record<string, string>;
}): undefined | void;
