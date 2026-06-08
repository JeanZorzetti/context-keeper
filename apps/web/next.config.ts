import type { NextConfig } from 'next'
import path from 'path'

// Next.js version: currently pinned to 15.x (stable).
// If user confirms Next.js 16, bump "next" in package.json — App Router APIs are identical.
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default nextConfig
