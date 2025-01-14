export { findPageFiles };
import glob from 'fast-glob';
import { assertWarning, toPosixPath, scriptFileExtensions } from '../utils.js';
import pc from '@brillout/picocolors';
async function findPageFiles(config, fileTypes, isDev) {
    const cwd = config.root;
    const timeBase = new Date().getTime();
    let pageFiles = await glob(fileTypes.map((fileType) => `**/*${fileType}.${scriptFileExtensions}`), { ignore: ['**/node_modules/**'], cwd, dot: false });
    pageFiles = pageFiles.map((p) => '/' + toPosixPath(p));
    const time = new Date().getTime() - timeBase;
    if (isDev) {
        // We only warn in dev, because while building it's expected to take a long time as fast-glob is competing for resources with other tasks
        assertWarning(time < 1.5 * 1000, `Finding your page files ${pc.cyan('**/*.page.*')} took an unexpected long time (${time}ms). Reach out to the vite-plugin-ssr maintainer.`, {
            onlyOnce: 'slow-page-files-search'
        });
    }
    return pageFiles;
}
