// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'], // Patrones para encontrar archivos de test
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/example.ts'],
  // The tokenizer is the foundation of the toolchain; keep its coverage high.
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
};
