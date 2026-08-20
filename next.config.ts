import type { NextConfig } from "next";

/**
 * Nothing to configure. The sheets are uploaded by the user and parsed in the
 * browser with the built-in DOMParser, so there is no server-side data access
 * and no loader to wire up.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
