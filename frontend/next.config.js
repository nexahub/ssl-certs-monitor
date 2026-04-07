/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Force l'utilisation de Webpack au lieu de Turbopack pour le build
  // Cela permet de conserver ta configuration webpack personnalisée sans erreur.
  webpack: (config, { dev }) => {
    // Ta config HMR/Polling pour le développement
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;