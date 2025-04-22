import { z } from 'zod';
import { SectionSchema } from './types.js';

// Schema für Tags in Tool-Argumenten
export const tagSchema = z.object({
    name: z.string().describe("Name des Tags"),
    value: z.string().optional().describe("Optionaler Wert des Tags")
});

export const SearchPagesArgsSchema = z.object({
    query: z.string().default("").describe("Suchanfrage für Seiten. Unterstützt Bookstack-Syntax wie [tag=wert] oder {type:page}."),
    page: z.number().min(1).optional().default(1).describe("Seitennummer der Ergebnisse."),
    count: z.number().min(1).max(100).optional().default(10).describe("Anzahl Ergebnisse pro Seite (max. 100)."),
});

export const GetPageContentArgsSchema = z.object({
    page_id: z.number().describe("Die eindeutige ID der Seite, deren Inhalt abgerufen werden soll."),
});

export const CreateBookArgsSchema = z.object({
    name: z.string().describe("Der Name des neuen Buches."),
    description: z.string().optional().describe("Optionale Beschreibung des Buches (Markdown)."),
    tags: z.array(tagSchema).optional().describe("Optionale Tags für das Buch."),
});

// Argumente für das Tool zum Erstellen einer Seite (strukturierter Input)



export const CreatePageToolArgsSchema = z.object({
    book_id: z.number().describe("ID des Buches, in dem die Seite erstellt werden soll."),
    page_title: z.string().describe("Der Haupttitel der neuen Seite."),
    sections: z.array(SectionSchema).min(1).describe("Die Inhaltsabschnitte der Seite."),
    tags: z.array(tagSchema).optional().describe("Optionale, manuell gesetzte Tags."),
    include_logo: z.boolean().optional().default(false).describe("Logo aus Styleguide am Anfang einfügen?"),
    chapter_id: z.number().optional().describe("Optionale ID eines Kapitels zur Zuordnung."),
    sprache: z.string().optional().describe("Sprache für Statusmeldungen (z.B. 'de', 'en')."),
    // --- NEUE METADATEN ARGUMENTE (optional) ---
    erstellt_von_benutzer: z.string().optional().describe("Name des Benutzers, der die Erstellung veranlasst hat (vom Client übergeben)."),
    verwendeter_client: z.string().optional().describe("Name/Typ des Clients oder Computers (vom Client übergeben, z.B. 'Laptop-ABC', 'VSCode Extension')."),
    verwendete_ki: z.string().optional().describe("Name des KI-Modells (vom Client übergeben, z.B. 'Claude 3 Opus').")
});

// --- Argumente für seite_aktualisieren erweitern ---
export const UpdatePageToolArgsSchema = z.object({
    page_id: z.number().describe("Die ID der zu aktualisierenden Seite."),
    page_title: z.string().optional().describe("Optional: Neuer Haupttitel für die Seite."),
    sections: z.array(SectionSchema).min(1).describe("Die neuen Inhaltsabschnitte der Seite (ersetzt den alten Inhalt)."),
    tags: z.array(tagSchema).optional().describe("Optional: Ein neuer Satz von Tags (ersetzt alte manuelle Tags; Auto-Tags werden neu generiert)."),
    include_logo: z.boolean().optional().default(false).describe("Logo aus Styleguide am Anfang einfügen?"),
    sprache: z.string().optional().describe("Sprache für Statusmeldungen (z.B. 'de', 'en')."),
     // --- NEUE METADATEN ARGUMENTE (optional) ---
    erstellt_von_benutzer: z.string().optional().describe("Name des Benutzers, der die Änderung veranlasst hat (vom Client übergeben)."),
    verwendeter_client: z.string().optional().describe("Name/Typ des Clients oder Computers (vom Client übergeben)."),
    verwendete_ki: z.string().optional().describe("Name des KI-Modells (vom Client übergeben).")
});
