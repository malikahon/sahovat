import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schema: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const errors: Record<string, unknown> = {};

    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        errors['body'] = result.error.flatten().fieldErrors;
      } else {
        req.body = result.data;
      }
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        errors['query'] = result.error.flatten().fieldErrors;
      } else {
        const parsed = result.data as Record<string, unknown>;
        // Store parsed query for use by handlers (authoritative source)
        (req as any).parsedQuery = parsed;
        // Also try to update req.query for backward compatibility
        try {
          (req as any).query = parsed;
        } catch {
          // Express 5 may prevent direct assignment; parsedQuery is the authoritative source
        }
      }
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        errors['params'] = result.error.flatten().fieldErrors;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).params = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
}
