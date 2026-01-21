module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js'
  ]
};
