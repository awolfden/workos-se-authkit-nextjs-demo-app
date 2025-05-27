/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workos-inc/widgets"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };

    // Add CSS modules support
    config.module.rules.push({
      test: /\.css$/,
      use: ["style-loader", "css-loader"],
    });

    return config;
  },
  // Add experimental features
  experimental: {
    esmExternals: "loose",
  },
  images: {
    domains: [], // Add any external domains here if needed
  },
  // If you're using local images in the public folder, you don't need to add domains
};

module.exports = nextConfig;
