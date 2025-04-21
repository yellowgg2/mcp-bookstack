import { z } from 'zod';
import { tagSchema } from './schemas_tools.js'; // Importiere tagSchema hierher

// Definiert die Struktur eines Inhaltsabschnitts für die Markdown-Generierung
export const SectionSchema = z.object({
    title: z.string().describe("Titel des Abschnitts"),
    content: z.string().describe("Inhalt des Abschnitts (Markdown-formatiert)"),
    type: z.enum(["info", "warning", "normal"]).optional().default("normal").describe("Art des Abschnitts für evtl. Icons/Formatierung")
});

export type Section = z.infer<typeof SectionSchema>;
export type Tag = z.infer<typeof tagSchema>; // Exportiere Tag-Typ