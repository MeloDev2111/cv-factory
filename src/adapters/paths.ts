import { fileURLToPath } from "node:url";

/** Package root. Works from `src/<dir>/` (tsx) and `dist/<dir>/` (built): both are two levels deep. */
export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
