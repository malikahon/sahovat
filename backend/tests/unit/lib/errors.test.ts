import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
} from '../../../src/lib/errors.js';

describe('AppError', () => {
  it('sets statusCode, code, and isOperational', () => {
    const err = new AppError('something went wrong', 500, 'INTERNAL');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL');
    expect(err.isOperational).toBe(true);
    expect(err.message).toBe('something went wrong');
  });

  it('defaults code to INTERNAL_ERROR', () => {
    const err = new AppError('test', 500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('is an instance of Error', () => {
    const err = new AppError('test', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('produces a 404 with NOT_FOUND code', () => {
    const err = new NotFoundError('Campaign not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('Campaign');
  });

  it('accepts a custom error code', () => {
    const err = new NotFoundError('User not found', 'USER_NOT_FOUND');
    expect(err.code).toBe('USER_NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });
});

describe('ValidationError', () => {
  it('produces a 400 with VALIDATION_ERROR code', () => {
    const err = new ValidationError('Invalid phone');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});

describe('UnauthorizedError', () => {
  it('produces a 401 with UNAUTHORIZED code', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });
});

describe('ForbiddenError', () => {
  it('produces a 403 with FORBIDDEN code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('ConflictError', () => {
  it('produces a 409 with CONFLICT code', () => {
    const err = new ConflictError('Duplicate entry');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('produces a 429 with RATE_LIMIT code', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT');
  });
});
