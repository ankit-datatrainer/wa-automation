/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wa/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "lookaside.fbsbx.com" },
    ],
  },
};

export default nextConfig;
