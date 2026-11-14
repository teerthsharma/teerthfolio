const nextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/tech/[[...path]]": ["./private/tech/**/*"] },
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
