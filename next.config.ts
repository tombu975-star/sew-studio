import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@node-rs/argon2"],
  compress: true,
  experimental: {
    // Import only the icons / chart parts / helpers a view really uses,
    // instead of pulling whole barrel files into every bundle.
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
  async headers() {
    const immutable = "public, max-age=31536000, immutable";
    return [
      { source: "/icon-:size.png", headers: [{ key: "Cache-Control", value: immutable }] },
      { source: "/logo.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      { source: "/atelier-login.jpg", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
