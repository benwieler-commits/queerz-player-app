import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.queerz.player',
  appName: 'QUEERZ Player',
  webDir: './',  // Change from '.' to './'
  server: {
    androidScheme: 'https'
  }
};

export default config;
