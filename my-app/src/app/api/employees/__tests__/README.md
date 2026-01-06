# Employee API Tests

This directory contains Jest tests for the CoreSignal Employee API routes.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for a specific file
npm test -- route.test.ts
```

## Test Coverage

The tests cover:

1. **Search Route** (`/api/employees/search`)
   - Successful employee ID searches
   - Error handling (missing API key, invalid requests, API errors)
   - Network error handling

2. **Collect Route** (`/api/employees/collect/[id]`)
   - Successful profile collection
   - ID validation
   - Error handling (missing API key, invalid IDs, API errors)

3. **Batch Collect Route** (`/api/employees/collect/batch`)
   - Batch collection with multiple IDs
   - Limit handling (default, custom, max)
   - Mixed success/failure scenarios
   - Invalid ID filtering

4. **Constants**
   - Constant value validation

## Test Structure

All tests use mocked `fetch` calls to avoid making real API requests. The tests verify:
- Correct API endpoint calls
- Proper request headers and body
- Response handling
- Error scenarios

## Environment Variables

Tests use a mock API key set in `jest.setup.js`. The actual `CORE_SIGNAL_API_KEY` environment variable is not required for running tests.

