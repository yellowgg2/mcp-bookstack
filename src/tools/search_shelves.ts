import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchShelvesArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';

export const searchShelvesToolSchema = {
    name: "regale_suchen",
    description: "Sucht nach Regalen in Bookstack anhand einer Suchanfrage. Gibt Titel, Beschreibung und URL zurück.",
    inputSchema: zodToJsonSchema(SearchShelvesArgsSchema)
};

export async function handleSearchShelves(
    args: z.infer<typeof SearchShelvesArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    // Wenn keine Suchanfrage angegeben ist, rufen wir alle Regale ab
    let searchResult;
    if (!args.query) {
        searchResult = await bookstackApi.getShelves();
    } else {
        searchResult = await bookstackApi.searchShelves(args.query, args.page, args.count);
    }

    if (!searchResult.data || searchResult.data.length === 0) {
        return "Keine Regale für diese Anfrage gefunden.";
    }

    // Formatiere die Ergebnisse
    const responseText = searchResult.data
        .map(
            (shelf) => {
                let result = `### ${shelf.name} (ID: ${shelf.id})\n`;
                
                if (shelf.description) {
                    result += `**Beschreibung:** ${shelf.description}\n`;
                }
                
                if (shelf.url) {
                    result += `**URL:** ${shelf.url}\n`;
                }
                
                if (shelf.tags && shelf.tags.length > 0) {
                    const tagNames = shelf.tags.map(tag => tag.name + (tag.value ? `:${tag.value}` : '')).join(', ');
                    result += `**Tags:** ${tagNames}\n`;
                }
                
                result += `**Erstellt:** ${new Date(shelf.created_at).toLocaleDateString('de-DE')}\n`;
                result += `**Aktualisiert:** ${new Date(shelf.updated_at).toLocaleDateString('de-DE')}\n`;
                
                result += '---';
                return result;
            }
        )
        .join("\n\n");

    const totalInfo = searchResult.total ? `\n\nGesamt: ${searchResult.total} Regale gefunden.` : '';
    return responseText + totalInfo;
}