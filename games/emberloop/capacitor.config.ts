import type { CapacitorConfig } from '@capacitor/cli';

// Native iPhone shell. The game itself is unchanged: `npm run build` makes dist/,
// `npx cap sync ios` copies it into the Xcode project. See IOS.md.
const config: CapacitorConfig = {
  appId: 'com.dragonphoenixascension.emberloop',
  appName: 'EMBERLOOP',
  webDir: 'dist',
  backgroundColor: '#0a0a0f',
  ios: {
    contentInset: 'never', // the game measures safe areas itself (core/safeArea.ts)
    backgroundColor: '#0a0a0f',
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
};

export default config;
