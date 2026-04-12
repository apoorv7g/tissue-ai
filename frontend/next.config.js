/** @type {import('next').NextConfig} */
const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000'

const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*',    destination: `${API_BASE}/api/:path*` },
      { source: '/auth/:path*',   destination: `${API_BASE}/auth/:path*` },
      { source: '/static/:path*', destination: `${API_BASE}/static/:path*` },
    ]
  },
}

module.exports = nextConfig
