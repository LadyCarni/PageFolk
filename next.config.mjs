/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Chakra, framer-motion and the FontAwesome icon set are barrel-exported libraries; this
    // makes the dev compiler pull in only the parts that are imported, which cuts compile time.
    optimizePackageImports: ['@chakra-ui/react', 'framer-motion', '@fortawesome/free-solid-svg-icons'],
  },
}
export default nextConfig
