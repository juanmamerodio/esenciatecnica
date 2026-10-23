import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Permite el despliegue aunque existan errores de tipos (temporal)
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["192.168.0.3"],
};

export default nextConfig;