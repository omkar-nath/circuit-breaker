module.exports = {
  preset: "ts-jest",
  testEnvironment: "node", // or "jsdom" for frontend testing
  testMatch: ["**/__tests__/**/*.test.ts"], // Test file pattern
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  clearMocks: true,
};
