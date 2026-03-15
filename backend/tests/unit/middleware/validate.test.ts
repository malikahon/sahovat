import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../../src/middleware/validate.js';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { json, status } as unknown as Response;
  return { res, json, status };
}

describe('validate middleware', () => {
  it('calls next() when body matches schema', () => {
    const schema = { body: z.object({ phone_number: z.string() }) };
    const middleware = validate(schema);
    const req = makeReq({ body: { phone_number: '+998901234567' } });
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 400 when body is missing required field', () => {
    const schema = { body: z.object({ phone_number: z.string() }) };
    const middleware = validate(schema);
    const req = makeReq({ body: {} });
    const { res, json, status } = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'VALIDATION_ERROR' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('strips extra fields not in schema', () => {
    const schema = { body: z.object({ name: z.string() }) };
    const middleware = validate(schema);
    const req = makeReq({ body: { name: 'Ali', extraField: 'should-be-stripped' } });
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.body as Record<string, unknown>)['extraField']).toBeUndefined();
  });

  it('validates query params', () => {
    const schema = { query: z.object({ page: z.coerce.number().optional() }) };
    const middleware = validate(schema);
    const req = makeReq({ query: { page: '2' } as unknown as Request['query'] });
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns validation errors for invalid query params', () => {
    const schema = { query: z.object({ page: z.coerce.number().min(1) }) };
    const middleware = validate(schema);
    const req = makeReq({ query: { page: '-1' } as unknown as Request['query'] });
    const { res, status } = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
