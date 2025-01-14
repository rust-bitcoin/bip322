export type { PageContextConfig };
import type { VikePackages } from '../../VikeNamespace.js';
import type { ConfigBuiltIn } from '../Config.js';
import type { Combine, IsNotEmpty, XOR4 } from './helpers.ts';
type PageContextConfig = ConfigBuiltIn & (ConfigVikePackagesNotEmptyXor extends true ? ConfigVikePackagesIntersection : ConfigVikePackagesCombined);
type ConfigVikePackagesIntersection = VikePackages.ConfigVikeReact & VikePackages.ConfigVikeVue & VikePackages.ConfigVikeSolid & VikePackages.ConfigVikeSvelte;
type ConfigVikePackagesCombined = Combine<VikePackages.ConfigVikeReact, Combine<VikePackages.ConfigVikeVue, Combine<VikePackages.ConfigVikeSolid, VikePackages.ConfigVikeSvelte>>>;
type ConfigVikePackagesNotEmptyXor = XOR4<IsNotEmpty<VikePackages.ConfigVikeReact>, IsNotEmpty<VikePackages.ConfigVikeVue>, IsNotEmpty<VikePackages.ConfigVikeSolid>, IsNotEmpty<VikePackages.ConfigVikeSvelte>>;
