import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BookStackAPI } from '../services/bookstack_api.js';
import { BookstackSearchResponse } from '../common/schemas_api.js';

// Schema für die Template-Suche
export const SearchTemplatesArgsSchema = z.object({
    query: z.string().default("").describe("Suchanfrage für Vorlagen. Unterstützt Bookstack-Syntax wie [tag=vorlage]."),
    page: z.number().min(1).optional().default(1).describe("Seitennummer der Ergebnisse."),
    count: z.number().min(1).max(100).optional().default(10).describe("Anzahl Ergebnisse pro Seite (max. 100).")
});

// Tool-Schema-Definition
export const searchTemplatesToolSchema = {
    name: "vorlage_suchen",
    description: "Sucht nach Vorlagen im Alpenlexikon basierend auf Tags oder Suchbegriffen.",
    inputSchema: zodToJsonSchema(SearchTemplatesArgsSchema)
};

// Handler-Funktion
export async function handleSearchTemplates(
    args: z.infer<typeof SearchTemplatesArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    // Füge [tag=vorlage] zur Suchanfrage hinzu, wenn nicht bereits vorhanden
    let searchQuery = args.query;
    if (!searchQuery.includes("[tag=vorlage]")) {
        searchQuery = searchQuery ? `${searchQuery} [tag=vorlage]` : "[tag=vorlage]";
    }

    // Suche nach Vorlagen
    const searchResult: BookstackSearchResponse = await bookstackApi.searchPages(
        searchQuery,
        args.page,
        args.count
    );

    // Formatiere die Ergebnisse
    if (searchResult.data.length === 0) {
        return "Keine Vorlagen gefunden.";
    }

    const total = searchResult.total ?? searchResult.data.length;
    let response = `${total} Vorlage(n) gefunden:\n\n`;
    
    searchResult.data.forEach((item, index) => {
        response += `${index + 1}. **${item.name}** (ID: ${item.id})\n`;
        if (item.tags && item.tags.length > 0) {
            const tagStr = item.tags.map(tag => 
                tag.value ? `${tag.name}=${tag.value}` : tag.name
            ).join(", ");
            response += `   Tags: ${tagStr}\n`;
        }
        if (item.preview_html?.content) {
            const preview = item.preview_html.content.substring(0, 100) + 
                (item.preview_html.content.length > 100 ? "..." : "");
            response += `   Vorschau: ${preview}\n`;
        }
        response += "\n";
    });

    if (total > searchResult.data.length) {
        response += `\nWeitere Ergebnisse verfügbar. Aktuelle Seite: ${args.page} von ${Math.ceil(total / args.count)}`;
    }

    return response;
}