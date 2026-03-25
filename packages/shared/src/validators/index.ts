import { z } from 'zod';

// ============================================
// Auth Validators
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatória'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Password deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Password deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Password deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Password deve conter pelo menos um número'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),
});

// ============================================
// Website Validators
// ============================================

export const websiteSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),
  url: z
    .string()
    .url('URL inválido')
    .refine(
      (url) => url.startsWith('https://'),
      'URL deve começar com https://'
    ),
  description: z
    .string()
    .min(20, 'Descrição deve ter pelo menos 20 caracteres')
    .max(500, 'Descrição não pode exceder 500 caracteres'),
  categoryId: z.string().uuid('Categoria inválida'),
});

export const websiteFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  featured: z.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['rating', 'date', 'name', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================
// Category Validators
// ============================================

export const categorySuggestionSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome não pode exceder 50 caracteres'),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(200, 'Descrição não pode exceder 200 caracteres'),
});

// ============================================
// Comment Validators
// ============================================

export const commentSchema = z.object({
  content: z
    .string()
    .min(3, 'Comentário deve ter pelo menos 3 caracteres')
    .max(1000, 'Comentário não pode exceder 1000 caracteres'),
  parentId: z.string().uuid().optional(),
});

// ============================================
// Rating Validators
// ============================================

export const ratingSchema = z.object({
  score: z
    .number()
    .int()
    .min(1, 'Avaliação mínima é 1')
    .max(5, 'Avaliação máxima é 5'),
});

// ============================================
// Report Validators
// ============================================

export const reportSchema = z.object({
  targetType: z.enum(['website', 'comment', 'user']),
  targetId: z.string().uuid('ID inválido'),
  reason: z.enum(['spam', 'inappropriate', 'misleading', 'broken', 'duplicate', 'other']),
  description: z.string().max(500).optional(),
});

// ============================================
// Type Exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type WebsiteSubmissionInput = z.infer<typeof websiteSubmissionSchema>;
export type WebsiteFiltersInput = z.infer<typeof websiteFiltersSchema>;
export type CategorySuggestionInput = z.infer<typeof categorySuggestionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
