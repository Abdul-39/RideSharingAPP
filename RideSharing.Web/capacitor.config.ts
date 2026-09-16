import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ridesharing.app',
  appName: 'RideSharing',
 webDir: 'dist/RideSharing.Web/browser',
  server: {
    // Use https scheme for Android (required for many plugins & cleartext rules)
    androidScheme: 'http',
    // During development you can uncomment the next line to load from ng serve
    // url: 'http://YOUR_PC_LAN_IP:4200',
    // cleartext: true
  },
  android: {
    allowMixedContent: true, // useful while backend is still on localhost / self-signed
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK'
    }
  }
};

export default config;
