import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchAllArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';

export const searchAllToolSchema = {
    name: "alle_inhalte_suchen",
    description: "Sucht alle Inhaltstypen (Regale, Bücher, Kapitel & Seiten) in Bookstack anhand einer Suchanfrage. Gibt Titel, Typ, URL und Vorschau zurück.",
    inputSchema: zodToJsonSchema(SearchAllArgsSchema)
};

export async function handleSearchAll(
    args: z.infer<typeof SearchAllArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    const searchResult = await bookstackApi.searchAll(args.query, args.page, args.count);

    if (!searchResult.data || searchResult.data.length === 0) {
        return "Keine Inhalte für diese Anfrage gefunden.";
    }

    // Formatiere die Ergebnisse basierend auf dem Inhaltstyp
    const responseText = searchResult.data
        .map(
            (item) => {
                // Gemeinsame Informationen für alle Typen
                let result = `### ${item.name} (ID: ${item.id})\n` +
                             `**Typ:** ${getContentTypeName(item.type)}\n` +
                             `**URL:** ${item.url}\n`;
                
                // Spezifische Informationen je nach Typ
                if (item.type === 'page' && item.book) {
                    result += `**Buch:** ${item.book.name}\n`;
                }
                
                // Vorschau hinzufügen, falls vorhanden
                if (item.preview_html?.content) {
                    result += `**Vorschau:** ${item.preview_html.content.substring(0, 200)}...\n`;
                }
                
                result += '---';
                return result;
            }
        )
        .join("\n\n");

    return responseText;
}

// Hilfsfunktion zur Übersetzung der Inhaltstypen
function getContentTypeName(type: string): string {
    switch (type) {
        case 'bookshelf': return 'Regal';
        case 'book': return 'Buch';
        case 'chapter': return 'Kapitel';
        case 'page': return 'Seite';
        default: return type;
    }
}