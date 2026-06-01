// Configuration Metro pour un monorepo pnpm.
// Indispensable : sans ça, Metro ne sait pas résoudre le paquet
// partagé @residenceconnect/shared (lié par symlink hors de apps/mobile)
// ni les dépendances installées à la racine du monorepo.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo (pour détecter les changements dans packages/shared)
config.watchFolders = [monorepoRoot];

// 2. Chercher les modules d'abord en local, puis à la racine du monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
