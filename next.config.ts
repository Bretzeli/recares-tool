import type { NextConfig } from "next";

/**
 * Nothing to configure: the dataset is read from ./data with `fs` inside server
 * components, so the sheets never enter the client bundle and need no loader.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
