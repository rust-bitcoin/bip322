export { findConfigVpsFromStemPackages };
import type { ConfigVpsUserProvided } from '../../../../shared/ConfigVps.js';
declare function findConfigVpsFromStemPackages(root: string): Promise<ConfigVpsUserProvided[]>;
