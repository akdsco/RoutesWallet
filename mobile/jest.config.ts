module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(expo-splash-screen|expo-router|expo-constants|expo-modules-core|expo|react-native|@react-native|react-native-gesture-handler|@react-navigation)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
