/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  
  // 1. Supprimé 'optimizeFonts' car c'est obsolète/invalide en v16
  
  // 2. Ajout de cette ligne pour dire à Next.js d'accepter ta config webpack 
  // même sous l'ère Turbopack, ou pour désactiver l'erreur.
  experimental: {
    turbo: {
      // Tu peux configurer des règles ici si nécessaire
    },
  },

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