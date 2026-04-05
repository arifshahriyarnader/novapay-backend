import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .email('Invalid email format'),
  password: z
    .string({ error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;