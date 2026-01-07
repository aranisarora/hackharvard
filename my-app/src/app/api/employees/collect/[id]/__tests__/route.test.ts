import { GET } from '../route';
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

describe('GET /api/employees/collect/[id]', () => {
  const mockRequest = () => {
    return {} as Request;
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
    it('should collect employee profile by ID', async () => {
      const employeeId = '719911355';
      const mockEmployeeData = {
        id: 719911355,
        experience: [
          {
            title: 'Senior Software Engineer',
            company_name: 'Google',
            start_date: '2019-06',
          },
        ],
        education: [],
        skills: [],
        location: 'United States',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEmployeeData,
      });

      const request = mockRequest();
      const response = await GET(request, { params: Promise.resolve({ id: employeeId }) });
      const responseData = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.coresignal.com/cdapi/v2/employee_base/collect/${employeeId}`,
        {
          method: 'GET',
          headers: {
            apikey: getApiKey(),
            Accept: 'application/json',
          },
        }
      );

      expect(responseData).toEqual(mockEmployeeData);
      expect(response.status).toBe(200);
    });

    it('should handle numeric string IDs', async () => {
      const employeeId = '123456789';
      const mockEmployeeData = { id: 123456789, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEmployeeData,
      });

      const request = mockRequest();
      const response = await GET(request, { params: Promise.resolve({ id: employeeId }) });
      const responseData = await response.json();

      expect(responseData).toEqual(mockEmployeeData);
      expect(response.status).toBe(200);
    });
  });

  describe('Error cases', () => {
    it('should return 500 if API key is not configured', async () => {
      delete process.env.CORE_SIGNAL_API_KEY;

      const request = mockRequest();
      const response = await GET(request, { params: { id: '123' } });
      const responseData = await response.json();

      expect(responseData.error).toBe('CoreSignal API key not configured');
      expect(response.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if employee ID is missing', async () => {
      const request = mockRequest();
      const response = await GET(request, { params: { id: '' } });
      const responseData = await response.json();

      expect(responseData.error).toBe('Employee ID is required');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if employee ID is not numeric', async () => {
      const request = mockRequest();
      const response = await GET(request, { params: { id: 'invalid-id' } });
      const responseData = await response.json();

      expect(responseData.error).toBe('Invalid employee ID format');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if employee ID contains non-numeric characters', async () => {
      const request = mockRequest();
      const response = await GET(request, { params: { id: '123abc' } });
      const responseData = await response.json();

      expect(responseData.error).toBe('Invalid employee ID format');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle CoreSignal API errors', async () => {
      const employeeId = '999999999';
      const errorText = 'Employee not found';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => errorText,
      });

      const request = mockRequest();
      const response = await GET(request, { params: Promise.resolve({ id: employeeId }) });
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to collect employee profile');
      expect(responseData.details).toBe(errorText);
      expect(response.status).toBe(404);
    });

    it('should handle network errors', async () => {
      const employeeId = '123456789';

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const request = mockRequest();
      const response = await GET(request, { params: Promise.resolve({ id: employeeId }) });
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to collect employee profile');
      expect(responseData.details).toBe('Network error');
      expect(response.status).toBe(500);
    });

    it('should handle 401 unauthorized errors', async () => {
      const employeeId = '123456789';
      const errorText = 'Unauthorized';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => errorText,
      });

      const request = mockRequest();
      const response = await GET(request, { params: Promise.resolve({ id: employeeId }) });
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to collect employee profile');
      expect(response.status).toBe(401);
    });
  });
});

