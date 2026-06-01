/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "clerk.house.gov",
        pathname: "/images/members/**"
      },
      {
        protocol: "https",
        hostname: "www.congress.gov",
        pathname: "/img/member/**"
      }
    ]
  }
};

export default nextConfig;
