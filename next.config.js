/** @type {import('next').NextConfig} */
const nextConfig = {
  // Improve webpack caching stability
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable filesystem cache entirely in dev to prevent corruption
      config.cache = false;
      
      // Use deterministic IDs to prevent module not found errors
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      
      // Reduce memory pressure
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  
  // Disable experimental features that can cause cache issues
  experimental: {
    swcMinify: false,
  },
  
  // Disable turbopack (uses webpack for stability)
  // turbo is still experimental and can cause cache issues
}

module.exports = nextConfig

