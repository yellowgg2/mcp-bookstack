import { z } from 'zod';

// Schema für Tags in API Antworten/Payloads
const apiTagSchema = z.object({
      name: z.string(),
      value: z.string().optional().nullable(),
      order: z.number().optional().nullable(),
      highlight_name: z.boolean().optional().nullable()
});

// Schema für Suchergebnisse (allgemein, für alle Inhaltstypen)
export const bookstackSearchItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  book_id: z.number().optional(),
  priority: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.string(),
  type: z.string(), // 'bookshelf', 'book', 'chapter', 'page'
  tags: z.array(apiTagSchema).optional().nullable(),
  book: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(),
  preview_html: z.object({ name: z.string(), content: z.string() }).optional().nullable()
});
export const bookstackSearchResponseSchema = z.object({
    data: z.array(bookstackSearchItemSchema),
    total: z.number().optional()
});

// Schema für Suchergebnisseiten (spezifisch für Seiten)
export const bookstackSearchPageSchema = bookstackSearchItemSchema.extend({
  book_id: z.number(),
  priority: z.number(),
});

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

// Schema für Regaldetails (API Antwort GET /shelves/{id})
export const shelfDetailsSchema = z.object({
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

// Schema für die Regale-Antwort (API Antwort GET /shelves)
export const bookstackShelvesResponseSchema = z.object({
    data: z.array(shelfDetailsSchema),
    total: z.number().optional()
});

// Schema für die Bücher-Antwort (API Antwort GET /books)
export const bookstackBooksResponseSchema = z.object({
    data: z.array(bookDetailsSchema),
    total: z.number().optional()
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
export type BookstackSearchItem = z.infer<typeof bookstackSearchItemSchema>;
export type BookstackPageData = z.infer<typeof bookstackPageDataSchema>;
export type BookDetails = z.infer<typeof bookDetailsSchema>;
export type PageDetails = BookstackPageData; // Detailierte Seitenansicht ist der beste Typ für Seiten
export type ShelfDetails = z.infer<typeof shelfDetailsSchema>;
export type BookstackShelvesResponse = z.infer<typeof bookstackShelvesResponseSchema>;
export type BookstackBooksResponse = z.infer<typeof bookstackBooksResponseSchema>;