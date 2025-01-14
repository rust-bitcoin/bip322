export type { Vike };
export type { VikePackages };
declare global {
    /** Refine Vike types. */
    namespace Vike {
        /** Extend and/or refine the `Config` type (`import type { Config } from 'vite-plugin-ssr/types'`).
         *
         *  For example:
         *  - You can refine the type of `Config['Page']`.
         *  - You can define the type of custom configurations created with `config.meta` (https://vite-plugin-ssr.com/meta)
         *
         */
        interface Config {
        }
        /** Extend and/or refine the `PageContext` type (`import type { PageContext } from 'vite-plugin-ssr/types'`).
         *
         *  For example:
         *  - You can define the type of fetched data, e.g. `PageContext['movies']`.
         *  - You can refine the type of `PageContext['Page']`.
         *
         */
        interface PageContext {
        }
    }
    /** This namespace is only used by:
     *  - `vike-react`
     *  - `vike-vue`
     *  - `vike-solid`
     *  - `vike-svelte`
     *
     *  As a Vike user, you can ignore this.
     */
    namespace VikePackages {
        interface ConfigVikeReact {
        }
        interface ConfigVikeVue {
        }
        interface ConfigVikeSolid {
        }
        interface ConfigVikeSvelte {
        }
    }
}
