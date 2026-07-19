// Configuration ESLint de l'app mobile.
// S'appuie sur le preset officiel Expo (`eslint-config-expo`), déjà installé.
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['/coverage/**', '/.expo/**', '/node_modules/**'],
};
