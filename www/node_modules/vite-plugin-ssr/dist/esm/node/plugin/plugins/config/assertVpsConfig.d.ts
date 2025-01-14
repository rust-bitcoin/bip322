export { assertVpsConfig };
import type { ConfigVpsUserProvided } from '../../../../shared/ConfigVps.js';
type WrongUsage = {
    prop: string;
    errMsg: `should be a${string}`;
};
declare function assertVpsConfig(vikeConfig: unknown, wrongUsageMsg: (wrongUsage: WrongUsage) => string): asserts vikeConfig is ConfigVpsUserProvided;
