import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'advisor', 'admin']),
  institutionId: z.string().uuid('Invalid institution ID'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  institutionId: z.string().uuid('Invalid institution ID'),
});

export const studentSchema = z.object({
  classYear: z.number().int().min(2000).max(2100),
  hasAccommodations: z.boolean().optional().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
