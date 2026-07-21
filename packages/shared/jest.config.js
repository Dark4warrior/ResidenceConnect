/**
 * Configuration Jest du package partagé.
 *
 * `packages/shared` est du TypeScript pur (aucune dépendance React Native) :
 * on n'utilise donc pas le preset `jest-expo` mais `babel-jest` avec un
 * transformateur minimal (types TypeScript + modules ESM → CommonJS).
 * Ces deux plugins Babel sont déjà présents dans le monorepo : aucune
 * nouvelle dépendance n'est ajoutée.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      {
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  // `types.ts` et `index.ts` ne contiennent que des déclarations de types et
  // des ré-exports : aucun code exécutable à couvrir.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types.ts',
  ],
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
};
