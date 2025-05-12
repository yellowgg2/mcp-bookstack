import { z } from 'zod';
import { tagSchema } from './schemas_tools.js'; // .js

// Stelle sicher, dass ALLE Typen hier im enum sind!
export const SectionSchema = z.object({
    title: z.string().describe("Titel des Abschnitts"),
    content: z.string().describe("Inhalt des Abschnitts (Markdown-formatiert)"),
    type: z.enum(["info", "warning", "success", "danger", "normal"]) // <-- Prüfen!
          .optional().default("normal")
          .describe("Art des Abschnitts für spezielle Formatierung/Icons (normal, info, warning, success, danger)")
});

export type Section = z.infer<typeof SectionSchema>;
export type Tag = z.infer<typeof tagSchema>;