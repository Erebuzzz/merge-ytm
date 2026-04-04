import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["lh3.googleusercontent.com"], 
  },
};

export default withSentryConfig(
  nextConfig,
  {
    org: "merge",
    project: "merge-frontend",
    silent: true, // Suppresses all logs
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
