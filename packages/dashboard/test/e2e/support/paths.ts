import path from 'node:path';

/** Absolute path to the file-fly repository root (`test/e2e/support` sits five levels below it). */
export const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');
/** Built backend entrypoint the e2e boots; rebuilt by the `test:e2e` script. */
export const BACKEND_MAIN = path.join(REPO_ROOT, 'packages', 'backend', 'dist', 'main.js');
/** Built SPA the backend serves at `/` during the screenshots. */
export const DASHBOARD_DIST = path.join(REPO_ROOT, 'packages', 'dashboard', 'dist');
/** Where the committed screenshots are written. */
export const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'docs', 'screenshots');
/** Port the backend listens on for this suite. Uncommon on purpose. */
export const PORT = 4523;
/** Origin the tests use for the booted backend. */
export const BASE_URL = `http://127.0.0.1:${String(PORT)}`;
/** TCP port fake clamd binds (the backend e2e owns 33331). */
export const CLAMAV_PORT = 33332;
