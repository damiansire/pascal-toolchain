module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Tests carry scaffolding imports/params on purpose; keep the strict
        // unused-symbol gate for production src only (tsconfig), not specs.
        tsconfig: {
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },
};
