import { POST } from '../route';
import { NextResponse } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400,
    })),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('POST /api/employees/search', () => {
  const mockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request;
  };

  const getApiKey = () => process.env.CORE_SIGNAL_API_KEY || 'test-api-key';
  let originalApiKey: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // Save original API key
    originalApiKey = process.env.CORE_SIGNAL_API_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original API key
    if (originalApiKey !== undefined) {
      process.env.CORE_SIGNAL_API_KEY = originalApiKey;
    } else {
      delete process.env.CORE_SIGNAL_API_KEY;
    }
  });

  describe('Success cases', () => {
    it('should search employees and return employee IDs', async () => {
      const mockEmployeeIds = [719911355, 277601540, 247605011];
      const mockBody = {
        experience_title: 'Software Engineer',
        experience_company_exact_name: 'Google',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEmployeeIds,
      });

      const request = mockRequest(mockBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.coresignal.com/cdapi/v2/employee_base/search/filter',
        {
          method: 'POST',
          headers: {
            apikey: getApiKey(),
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockBody),
        }
      );

      expect(responseData).toEqual({
        employeeIds: mockEmployeeIds,
        count: mockEmployeeIds.length,
      });
      expect(response.status).toBe(200);
    });

    it('should handle empty results', async () => {
      const mockBody = {
        experience_title: 'NonExistent Role',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const request = mockRequest(mockBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData).toEqual({
        employeeIds: [],
        count: 0,
      });
    });
  });

  describe('Error cases', () => {
    it('should return 500 if API key is not configured', async () => {
      delete process.env.CORE_SIGNAL_API_KEY;

      const request = mockRequest({ experience_title: 'Engineer' });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('CoreSignal API key not configured');
      expect(response.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if request body is missing', async () => {
      const request = {
        json: jest.fn().mockResolvedValue(null),
      } as unknown as Request;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Request body is required');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if request body is not an object', async () => {
      const request = {
        json: jest.fn().mockResolvedValue('invalid'),
      } as unknown as Request;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Request body is required');
      expect(response.status).toBe(400);
    });

    it('should handle CoreSignal API errors', async () => {
      const mockBody = { experience_title: 'Engineer' };
      const errorText = 'Invalid API key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => errorText,
      });

      const request = mockRequest(mockBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to search employees');
      expect(responseData.details).toBe(errorText);
      expect(response.status).toBe(401);
    });

    it('should handle invalid response format (non-array)', async () => {
      const mockBody = { experience_title: 'Engineer' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' }),
      });

      const request = mockRequest(mockBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Invalid response format from CoreSignal');
      expect(response.status).toBe(500);
    });

    it('should handle network errors', async () => {
      const mockBody = { experience_title: 'Engineer' };

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const request = mockRequest(mockBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to search employees');
      expect(responseData.details).toBe('Network error');
      expect(response.status).toBe(500);
    });
  });
});

