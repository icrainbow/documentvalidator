/** @type {import('next').NextConfig} */
const nextConfig = {
  // Improve webpack caching stability
  webpack: (config, { dev }) => {
    if (dev) {
      // Reduce memory pressure and improve cache stability in dev mode
      config.cache = {
        type: 'filesystem',
        compression: false,
        // Increase cache invalidation threshold
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      };
      
      // Optimize chunk splitting to prevent module not found errors
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
    }
    return config;
  },
  
  // Disable certain optimizations that can cause cache issues
  experimental: {
    // Disable SWC minification in dev (can cause cache corruption)
    swcMinify: false,
  },
}

module.exports = nextConfig

