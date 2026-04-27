import { z } from 'zod';

/**
 * Contact form submission schema.
 *
 * Fields:
 *   - name, subject, message: required, length-bounded
 *   - email, phone: optional
 *   - locale: optional, used to localize the auto-reply email
 *   - website: HONEYPOT — must be empty. Bots fill all fields.
 */
export const submitContactSchema = {
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be at most 80 characters'),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email')
        .max(320, 'Email too long')
        .optional()
        .or(z.literal('').transform(() => undefined)),
      phone: z
        .string()
        .trim()
        .max(32, 'Phone too long')
        .optional()
        .or(z.literal('').transform(() => undefined)),
      subject: z
        .string()
        .trim()
        .min(4, 'Subject must be at least 4 characters')
        .max(120, 'Subject must be at most 120 characters'),
      message: z
        .string()
        .trim()
        .min(10, 'Message must be at least 10 characters')
        .max(4000, 'Message must be at most 4000 characters'),
      locale: z.enum(['uz', 'ru', 'en']).optional().default('uz'),
      // Honeypot — must be empty/missing. Real users never see this field.
      website: z
        .string()
        .max(0, 'Spam detected')
        .optional()
        .or(z.literal('').transform(() => undefined)),
    })
    .strict(),
};

export type SubmitContactDto = z.infer<typeof submitContactSchema.body>;
