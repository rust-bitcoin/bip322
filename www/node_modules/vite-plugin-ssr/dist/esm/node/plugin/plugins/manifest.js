export { manifest };
import { projectInfo, viteIsSSR, toPosixPath, assertPosixPath, isNotNullish } from '../utils.js';
import { assertPluginManifest } from '../../shared/assertPluginManifest.js';
import { isUsingClientRouter } from './extractExportNamesPlugin.js';
import { getConfigVps } from '../../shared/getConfigVps.js';
import path from 'path';
import { getRuntimeManifest } from '../../runtime/globalContext.js';
function manifest() {
    let configVps;
    let config;
    return [
        {
            name: 'vite-plugin-ssr:pluginManifest',
            apply: 'build',
            async configResolved(config_) {
                config = config_;
                configVps = await getConfigVps(config);
            },
            generateBundle() {
                if (viteIsSSR(config))
                    return;
                const runtimeManifest = getRuntimeManifest(configVps);
                const manifest = {
                    version: projectInfo.projectVersion,
                    usesClientRouter: isUsingClientRouter(),
                    manifestKeyMap: getManifestKeyMap(configVps, config),
                    ...runtimeManifest
                };
                assertPluginManifest(manifest);
                this.emitFile({
                    fileName: `vite-plugin-ssr.json`,
                    type: 'asset',
                    source: JSON.stringify(manifest, null, 2)
                });
            }
        }
    ];
}
function getManifestKeyMap(configVps, config) {
    const manifestKeyMap = {};
    configVps.extensions
        .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
        .flat()
        .filter(isNotNullish)
        .forEach(({ importPath, filePath }) => {
        // Recreating https://github.com/vitejs/vite/blob/8158ece72b66307e7b607b98496891610ca70ea2/packages/vite/src/node/plugins/manifest.ts#L38
        const filePathRelative = path.posix.relative(config.root, toPosixPath(filePath));
        assertPosixPath(filePathRelative);
        assertPosixPath(importPath);
        manifestKeyMap[importPath] = filePathRelative;
    });
    return manifestKeyMap;
}
