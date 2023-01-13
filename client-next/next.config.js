const nextMDX = require("@next/mdx");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  basePath: process.env.GITHUB_ACTIONS ? "/modular-things" : ""
}

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
  }
});

module.exports = withMDX(nextConfig);
