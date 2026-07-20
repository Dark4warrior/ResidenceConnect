/// <reference types="node" />
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ResidenceConnect',
  slug: 'residenceconnect',
  // Les plugins déclarent les autorisations natives (caméra, photothèque).
  // Expo Go les fournit déjà, mais un build EAS planterait sans ces textes —
  // et l'App Store refuse toute app qui accède à la caméra sans justification.
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission:
          'ResidenceConnect accède à vos photos pour joindre une image à un signalement.',
        cameraPermission:
          'ResidenceConnect utilise l’appareil photo pour photographier l’incident signalé.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'ResidenceConnect utilise l’appareil photo pour photographier l’incident signalé.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: '',
    },
  },
});
