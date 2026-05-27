import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com"
      }
    ]
  }
};

export default nextConfig;
