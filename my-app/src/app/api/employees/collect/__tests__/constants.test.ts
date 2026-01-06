import {
  DEFAULT_RESUMES_TO_COLLECT,
  MAX_RESUMES_TO_COLLECT,
} from '../constants';

describe('Employee Collection Constants', () => {
  it('should have DEFAULT_RESUMES_TO_COLLECT defined', () => {
    expect(DEFAULT_RESUMES_TO_COLLECT).toBeDefined();
    expect(typeof DEFAULT_RESUMES_TO_COLLECT).toBe('number');
    expect(DEFAULT_RESUMES_TO_COLLECT).toBeGreaterThan(0);
  });

  it('should have MAX_RESUMES_TO_COLLECT defined', () => {
    expect(MAX_RESUMES_TO_COLLECT).toBeDefined();
    expect(typeof MAX_RESUMES_TO_COLLECT).toBe('number');
    expect(MAX_RESUMES_TO_COLLECT).toBeGreaterThan(0);
  });

  it('should have MAX_RESUMES_TO_COLLECT greater than DEFAULT_RESUMES_TO_COLLECT', () => {
    expect(MAX_RESUMES_TO_COLLECT).toBeGreaterThan(
      DEFAULT_RESUMES_TO_COLLECT
    );
  });

  it('should have reasonable default values', () => {
    expect(DEFAULT_RESUMES_TO_COLLECT).toBe(10);
    expect(MAX_RESUMES_TO_COLLECT).toBe(50);
  });
});

