import { POST } from '../route';
import { NextResponse } from 'next/server';
import {
  DEFAULT_RESUMES_TO_COLLECT,
  MAX_RESUMES_TO_COLLECT,
} from '../../constants';

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

describe('POST /api/employees/collect/batch', () => {
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
    it('should collect multiple employee profiles', async () => {
      const employeeIds = [719911355, 277601540, 247605011];
      const mockEmployees = [
        { id: 719911355, experience: [], name: 'John Doe' },
        { id: 277601540, experience: [], name: 'Jane Smith' },
        { id: 247605011, experience: [], name: 'Bob Johnson' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmployees[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmployees[1],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmployees[2],
        });

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(responseData.success).toBe(true);
      expect(responseData.totalRequested).toBe(3);
      expect(responseData.totalCollected).toBe(3);
      expect(responseData.totalFailed).toBe(0);
      expect(responseData.employees).toHaveLength(3);
      expect(responseData.employees).toEqual(mockEmployees);
      expect(response.status).toBe(200);
    });

    it('should use default limit when not specified', async () => {
      const employeeIds = Array.from({ length: 20 }, (_, i) => 1000000 + i);
      const mockEmployee = { id: 1000000, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEmployee,
      });

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.limit).toBe(DEFAULT_RESUMES_TO_COLLECT);
      expect(global.fetch).toHaveBeenCalledTimes(DEFAULT_RESUMES_TO_COLLECT);
    });

    it('should respect custom limit', async () => {
      const employeeIds = Array.from({ length: 20 }, (_, i) => 1000000 + i);
      const customLimit = 5;
      const mockEmployee = { id: 1000000, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEmployee,
      });

      const request = mockRequest({ employeeIds, limit: customLimit });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.limit).toBe(customLimit);
      expect(global.fetch).toHaveBeenCalledTimes(customLimit);
    });

    it('should respect MAX_RESUMES_TO_COLLECT limit', async () => {
      const employeeIds = Array.from({ length: 100 }, (_, i) => 1000000 + i);
      const mockEmployee = { id: 1000000, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEmployee,
      });

      const request = mockRequest({ employeeIds, limit: 100 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.limit).toBe(MAX_RESUMES_TO_COLLECT);
      expect(global.fetch).toHaveBeenCalledTimes(MAX_RESUMES_TO_COLLECT);
    });

    it('should handle mixed success and failure', async () => {
      const employeeIds = [719911355, 277601540, 999999999];
      const mockEmployees = [
        { id: 719911355, experience: [], name: 'John Doe' },
        { id: 277601540, experience: [], name: 'Jane Smith' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmployees[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmployees[1],
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Employee not found',
        });

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.totalRequested).toBe(3);
      expect(responseData.totalCollected).toBe(2);
      expect(responseData.totalFailed).toBe(1);
      expect(responseData.employees).toHaveLength(2);
      expect(responseData.errors).toHaveLength(1);
      expect(responseData.errors[0].employeeId).toBe(999999999);
    });

    it('should handle string employee IDs', async () => {
      const employeeIds = ['719911355', '277601540'];
      const mockEmployee = { id: 719911355, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEmployee,
      });

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.totalCollected).toBe(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error cases', () => {
    it('should return 500 if API key is not configured', async () => {
      delete process.env.CORE_SIGNAL_API_KEY;

      const request = mockRequest({ employeeIds: [123] });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('CoreSignal API key not configured');
      expect(response.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if employeeIds is missing', async () => {
      const request = mockRequest({});
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('employeeIds array is required');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if employeeIds is not an array', async () => {
      const request = mockRequest({ employeeIds: 'not-an-array' });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('employeeIds array is required');
      expect(response.status).toBe(400);
    });

    it('should return 400 if employeeIds array is empty', async () => {
      const request = mockRequest({ employeeIds: [] });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('employeeIds array cannot be empty');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if no valid employee IDs provided', async () => {
      const request = mockRequest({ employeeIds: ['invalid', 'also-invalid'] });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('No valid employee IDs provided');
      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should filter out invalid IDs and process valid ones', async () => {
      const employeeIds = ['719911355', 'invalid-id', '277601540'];
      const mockEmployee = { id: 719911355, experience: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEmployee,
      });

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      // Should only process the 2 valid IDs
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(responseData.totalCollected).toBe(2);
    });

    it('should handle network errors for individual requests', async () => {
      const employeeIds = [719911355, 277601540];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 719911355, experience: [] }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const request = mockRequest({ employeeIds });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.totalCollected).toBe(1);
      expect(responseData.totalFailed).toBe(1);
      expect(responseData.errors[0].error).toBe('Network error');
    });

    it('should handle general errors', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      } as unknown as Request;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.error).toBe('Failed to collect employee profiles');
      expect(responseData.details).toBe('Parse error');
      expect(response.status).toBe(500);
    });
  });
});

