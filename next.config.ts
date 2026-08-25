import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  allowedDevOrigins: [
    "127.0.0.1",
    "*.cursor.sh",
    "**.cursor.sh",
    "*.cursor.com",
    "**.cursor.com",
    "*.cursorusercontent.com",
    "**.cursorusercontent.com",
  ],
};

export default nextConfig;
