import { env } from "cloudflare:workers";

/**
 * Single entry point for Cloudflare bindings/secrets.
 *
 * IMPORTANT: this file must only ever be imported from `*.server.ts`
 * modules or from inside server-function handler bodies. TanStack Start's
 * import protection (`**\/*.server.*`) keeps those out of the client
 * bundle, where `cloudflare:workers` cannot be resolved.
 */
export { env };
