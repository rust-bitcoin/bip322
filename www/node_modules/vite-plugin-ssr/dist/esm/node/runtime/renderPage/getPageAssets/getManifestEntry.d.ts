export { getManifestEntry };
import type { ViteManifest, ViteManifestEntry } from '../../../shared/ViteManifest.js';
declare function getManifestEntry(id: string, clientManifest: ViteManifest, manifestKeyMap: Record<string, string>): {
    manifestKey: string;
    manifestEntry: ViteManifestEntry;
};
