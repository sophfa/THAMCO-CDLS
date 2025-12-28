module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/seed/**",
    "!src/app.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 48,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 10000,
};
