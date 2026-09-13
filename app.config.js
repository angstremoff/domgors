/* eslint-env node */
import 'dotenv/config';

const pkg = require('./package.json');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const APP_VERSION = process.env.APP_VERSION || pkg.version;

export default ({ config }) => {
  const expoConfig = {
    name: 'DomGoMobile',
    slug: 'DomGoMobile',
    scheme: 'domgomobile',
    version: APP_VERSION,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    jsEngine: 'hermes',
    updates: {
      enabled: false,
      checkAutomatically: 'ON_ERROR_RECOVERY',
      fallbackToCacheTimeout: 0
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.DomGoMobile',
      buildNumber: '18'
    },
    android: {
      allowBackup: false,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'domgo.rs',
      versionCode: 22,
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY
        }
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'domgomobile',
              host: 'property',
              pathPrefix: '/'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        },
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'domgomobile',
              host: 'agency',
              pathPrefix: '/'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        },
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: 'domgomobile',
              host: 'auth',
              pathPrefix: '/callback'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      eas: {
        projectId: '313d8153-28aa-426a-a0f3-b580238521e5'
      }
    },
    runtimeVersion: '1.0.4',
    owner: 'angstremoff'
  };

  return { ...config, ...expoConfig };
};
