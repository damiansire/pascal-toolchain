module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  // Enforce coverage so it stops being decorative. The floor sits just below the
  // current numbers: it catches regressions in the branch-heavy code generator
  // without being aspirational. (index.ts is a trivial re-export, so the threshold
  // targets codegen.ts directly rather than a diluted global average.)
  coverageThreshold: {
    './src/codegen.ts': {
      branches: 73,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
};
