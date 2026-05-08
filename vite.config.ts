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
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Scanor Store',
          short_name: 'Scanor',
          description: 'متجر سكانور لشحن شدات ببجي موبايل بشكل آمن وسريع',
          theme_color: '#f59e0b',
          background_color: '#000000',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'minimal-ui'],
          start_url: '/',
          id: '/',
          scope: '/',
          lang: 'ar',
          dir: 'rtl',
          orientation: 'portrait',
          categories: ['games', 'shopping'],
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
              icons: [{ src: 'https://cdn-icons-png.flaticon.com/512/2649/2649297.png', sizes: '192x192' }]
            }
          ],
          screenshots: [
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&h=1920&auto=format&fit=crop',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Scanor Store Home'
            },
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&h=1080&auto=format&fit=crop',
              sizes: '1920x1080',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Scanor Store Desktop'
            }
          ]
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
