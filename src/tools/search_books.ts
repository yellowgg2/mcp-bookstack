import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchBooksArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';

export const searchBooksToolSchema = {
    name: "buecher_suchen",
    description: "Sucht nach Büchern in Bookstack anhand einer Suchanfrage. Gibt Titel, Beschreibung und URL zurück.",
    inputSchema: zodToJsonSchema(SearchBooksArgsSchema)
};

export async function handleSearchBooks(
    args: z.infer<typeof SearchBooksArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    // Wenn keine Suchanfrage angegeben ist, rufen wir alle Bücher ab
    let searchResult;
    if (!args.query) {
        searchResult = await bookstackApi.getBooks();
    } else {
        searchResult = await bookstackApi.searchBooks(args.query, args.page, args.count);
    }

    if (!searchResult.data || searchResult.data.length === 0) {
        return "Keine Bücher für diese Anfrage gefunden.";
    }

    // Formatiere die Ergebnisse
    const responseText = searchResult.data
        .map(
            (book) => {
                let result = `### ${book.name} (ID: ${book.id})\n`;
                
                if (book.description) {
                    result += `**Beschreibung:** ${book.description}\n`;
                }
                
                if (book.url) {
                    result += `**URL:** ${book.url}\n`;
                }
                
                if (book.tags && book.tags.length > 0) {
                    const tagNames = book.tags.map(tag => tag.name + (tag.value ? `:${tag.value}` : '')).join(', ');
                    result += `**Tags:** ${tagNames}\n`;
                }
                
                result += `**Erstellt:** ${new Date(book.created_at).toLocaleDateString('de-DE')}\n`;
                result += `**Aktualisiert:** ${new Date(book.updated_at).toLocaleDateString('de-DE')}\n`;
                
                result += '---';
                return result;
            }
        )
        .join("\n\n");

    const totalInfo = searchResult.total ? `\n\nGesamt: ${searchResult.total} Bücher gefunden.` : '';
    return responseText + totalInfo;
}