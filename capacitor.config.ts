import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thaqalayn.app',
  appName: 'Thaqalayn',
  webDir: 'dist/Thaqalayn/browser',
  server: {
    // Use the production URL for initial load, then serve locally
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1a2e',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1a1a2e',
  },
};

export default config;
