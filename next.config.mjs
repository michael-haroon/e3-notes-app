/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@prisma/engines"],
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const prev = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...prev,
        ({ request }, callback) => {
          if (request && request.startsWith("node:")) {
            return callback(null, "commonjs " + request.replace(/^node:/, ""));
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
