/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false; // pdf.js optional node dependency
    return config;
  },
};
export default nextConfig;
