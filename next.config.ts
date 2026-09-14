import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Keep Wooftag mint/status and other APIs off the cache path.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
        handler: "NetworkOnly" as const,
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // next-pwa injects webpack; keep turbopack key so Next 16 stays quiet in dev.
  turbopack: {},
};

export default withPWA(nextConfig);
