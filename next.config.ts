import type {NextConfig} from 'next';
import {PHASE_DEVELOPMENT_SERVER} from 'next/constants';
import firebaseConfig from './firebase-applet-config.json';

/**
 * Headers de segurança (0.5-D6).
 * CSP liberando só o que o app usa: Firebase Auth (popup do Google), Firestore e as
 * imagens hospedadas fora. 'unsafe-inline' em script é exigido pelo Next sem nonce.
 * frame-ancestors só é aplicado se CSP_FRAME_ANCESTORS for definido, para não quebrar
 * a pré-visualização do AI Studio (que exibe o app dentro de um iframe).
 */
function securityHeaders(dev: boolean) {
  const frameAncestors = process.env.CSP_FRAME_ANCESTORS?.trim();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://apis.google.com https://www.gstatic.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ibb.co https://i.supaimg.com https://picsum.photos https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.googleapis.com https://apis.google.com wss://*.firebaseio.com https://*.firebaseio.com${dev ? ' ws: wss:' : ''}`,
    `frame-src 'self' https://${firebaseConfig.authDomain} https://accounts.google.com https://apis.google.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(frameAncestors ? [`frame-ancestors ${frameAncestors}`] : []),
  ].join('; ');

  return [
    {key: 'Content-Security-Policy', value: csp},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
    // Popup do login com Google precisa manter a referência à janela que abriu
    {key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups'},
    ...(dev
      ? []
      : [{key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'}]),
  ];
}

const nextConfig = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  reactStrictMode: true,
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'i.supaimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [{source: '/:path*', headers: securityHeaders(phase === PHASE_DEVELOPMENT_SERVER)}];
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  // Só afeta o servidor de desenvolvimento (HMR/recursos de dev). *.run.app é o host
  // do preview do AI Studio; em produção (next start) esta lista não é usada.
  allowedDevOrigins: ['*.run.app', 'localhost:8080', 'localhost:3000'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
});

export default nextConfig;

