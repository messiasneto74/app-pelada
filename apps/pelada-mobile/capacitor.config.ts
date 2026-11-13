import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Build web antes: `npm run build:mobile` na raiz.
 * Staging: `npm run build:web:staging` + `npm run cap:sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.pelada.app',
  appName: 'Pelada',
  webDir: '../pelada-web/dist/pelada-web/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {},
};

export default config;
