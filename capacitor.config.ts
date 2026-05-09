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
      backgroundColor: '#1a1a1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1a1a',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1a1a1a',
  },
};

export default config;
