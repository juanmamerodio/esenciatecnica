import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de producto viven en Supabase Storage (las sube el Admin en T7).
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  allowedDevOrigins: ["192.168.0.3"],
};

export default nextConfig;
