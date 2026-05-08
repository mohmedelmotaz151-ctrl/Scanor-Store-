import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'متجر سكانور',
          short_name: 'سكانور',
          description: 'متجر سكانور لشحن شدات ببجي موبايل بشكل آمن وسريع',
          theme_color: '#f59e0b',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          id: '/',
          scope: '/',
          lang: 'ar',
          dir: 'rtl',
          orientation: 'portrait',
          categories: ['games', 'shopping', 'entertainment'],
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/8002/8002123.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/8002/8002123.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/8002/8002123.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'تتبع الطلب',
              short_name: 'تتبع',
              description: 'متابعة حالة طلبك',
              url: '/track',
              icons: [{ src: 'https://cdn-icons-png.flaticon.com/512/2649/2649297.png', sizes: '512x512', type: 'image/png' }]
            }
          ],
          screenshots: [
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&h=1920&auto=format&fit=crop',
              sizes: '1080x1920',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'Scanor Store Mobile'
            },
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&h=1080&auto=format&fit=crop',
              sizes: '1920x1080',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Scanor Store Desktop'
            }
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
