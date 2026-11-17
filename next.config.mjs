// Plates are content-addressed (/plates/f) or change in place (/plates/m); /org and /fonts keep their names.
const cache = (value) => [{ key: "Cache-Control", value }];

const nextConfig = {
  devIndicators: false,
  async headers() {
    return [
      { source: "/plates/f/:file", headers: cache("public, max-age=31536000, immutable") },
      { source: "/plates/m/:file", headers: cache("public, max-age=300, stale-while-revalidate=86400") },
      { source: "/org/:file", headers: cache("public, max-age=86400, stale-while-revalidate=604800") },
      { source: "/fonts/:file", headers: cache("public, max-age=86400, stale-while-revalidate=604800") },
      { source: "/icon.svg", headers: cache("public, max-age=86400, stale-while-revalidate=604800") },
      { source: "/opengraph-image", headers: cache("public, max-age=86400, stale-while-revalidate=604800") },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

export default nextConfig;
