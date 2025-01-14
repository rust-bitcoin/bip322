export { addSsrMiddleware };
import type { ViteDevServer } from 'vite';
type ConnectServer = ViteDevServer['middlewares'];
declare function addSsrMiddleware(middlewares: ConnectServer): void;
