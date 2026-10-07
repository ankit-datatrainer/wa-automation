/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second dev server (e.g. the demo-mode instance) run beside the main one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@wa/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "lookaside.fbsbx.com" },
      // Marketing photography (Unsplash License).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
