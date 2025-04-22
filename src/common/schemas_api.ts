import { z } from 'zod';

// Schema für Tags in API Antworten/Payloads
const apiTagSchema = z.object({
      name: z.string(),
      value: z.string().optional().nullable(),
      order: z.number().optional().nullable(),
      highlight_name: z.boolean().optional().nullable()
});

// Schema für Suchergebnisseiten (gekürzt)
export const bookstackSearchPageSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  book_id: z.number(),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.string(),
  type: z.string(),
  tags: z.array(apiTagSchema).optional().nullable(),
  book: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(),
  preview_html: z.object({ name: z.string(), content: z.string() }).optional().nullable()
});
export const bookstackSearchResponseSchema = z.object({ data: z.array(bookstackSearchPageSchema) });

// Schema für detaillierte Seitendaten (API Antwort GET /pages/{id})
export const bookstackPageDataSchema = z.object({
  id: z.number(),
  book_id: z.number(),
  chapter_id: z.number().nullable(),
  name: z.string(),
  slug: z.string(),
  html: z.string().optional(),
  markdown: z.string().optional(),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(),
  updated_by: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(),
  draft: z.boolean().optional().nullable(),
  revision_count: z.number().optional().nullable(),
  template: z.boolean().optional().nullable(),
  owned_by: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(),
  editor: z.string().optional().nullable(),
  raw_html: z.string().optional().nullable(),
  tags: z.array(apiTagSchema).optional().nullable(),
  url: z.string().optional()
});

// Schema für Buchdetails (API Antwort GET /books/{id})
export const bookDetailsSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.number().optional().nullable(),
    updated_by: z.number().optional().nullable(),
    owned_by: z.number().optional().nullable(),
    url: z.string().optional(),
    tags: z.array(apiTagSchema).optional().nullable(),
});

// Typen für API Payloads (Request Bodies)
const apiPayloadTagSchema = z.object({ name: z.string(), value: z.string().optional() }); // API erwartet value optional

export const createBookApiPayloadSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(apiPayloadTagSchema).optional(),
});
export type CreateBookApiPayload = z.infer<typeof createBookApiPayloadSchema>;

export const createPageApiPayloadSchema = z.object({
  book_id: z.number(),
  name: z.string(),
  markdown: z.string(), // API erwartet 'markdown'
  tags: z.array(apiPayloadTagSchema).optional(),
  chapter_id: z.number().optional()
});
export type CreatePageApiPayload = z.infer<typeof createPageApiPayloadSchema>;

export const updatePageApiPayloadSchema = z.object({
  name: z.string().optional(),
  markdown: z.string(), // API erwartet 'markdown'
  tags: z.array(apiPayloadTagSchema).optional(),
});
export type UpdatePageApiPayload = z.infer<typeof updatePageApiPayloadSchema>;

// Typen für API-Antworten
export type BookstackSearchResponse = z.infer<typeof bookstackSearchResponseSchema>;
export type BookstackPageData = z.infer<typeof bookstackPageDataSchema>;
export type BookDetails = z.infer<typeof bookDetailsSchema>;
export type PageDetails = BookstackPageData; // Detailierte Seitenansicht ist der beste Typ für Seiten