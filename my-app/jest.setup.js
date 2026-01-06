// Jest setup file
// This file runs before each test file

// Note: CORE_SIGNAL_API_KEY will be read from environment variables
// Make sure to set it in your .env.local or .env file
// The tests mock fetch calls, so a real API key is not required for tests to run

// Suppress console errors in tests (optional - remove if you want to see them)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

