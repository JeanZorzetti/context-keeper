import type { NextConfig } from 'next'

// Next.js version: currently pinned to 15.x (stable).
// If user confirms Next.js 16, bump "next" in package.json — App Router APIs are identical.
const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
