// Jest setup for React Native
/* eslint-disable no-undef */
require('react-native-gesture-handler/jestSetup');

// Mock react-native modules that cause issues
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock expo modules
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Global test utilities
global.__TEST__ = true; 