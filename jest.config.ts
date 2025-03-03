module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(expo-splash-screen|expo-router|expo-constants|expo-modules-core|expo|react-native|@react-native|react-native-gesture-handler|@react-navigation)/)", // ✅ Allow Jest to process expo-splash-screen
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
