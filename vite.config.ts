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
          name: 'Scanor STORE',
          short_name: 'Scanor',
          description: 'متجر سكانور لشحن شدات ببجي موبايل بشكل آمن وسريع',
          theme_color: '#f59e0b',
          background_color: '#000000',
          display: 'standalone',
          icons: [
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=192&h=192&auto=format&fit=crop',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=512&h=512&auto=format&fit=crop',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=512&h=512&auto=format&fit=crop',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
