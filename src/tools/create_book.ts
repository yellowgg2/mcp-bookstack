import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js'; // Nicht mehr benötigt für Annotation
import { CreateBookArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import type { CreateBookApiPayload, BookDetails } from '../common/schemas_api.js';
import { findSimilarBooks } from '../common/utils.js';

// KEINE explizite Typ-Annotation mehr! TypeScript leitet den Typ ab.
export const createBookToolSchema = {
    name: "buch_erstellen",
    description: "Erstellt ein neues Buch in Bookstack.",
    inputSchema: zodToJsonSchema(CreateBookArgsSchema)
};

// Handler Function
export async function handleCreateBook(
    args: z.infer<typeof CreateBookArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> { // Returns the result text
    
    // Prüfen, ob ähnliche Bücher existieren, falls gewünscht
    if (args.check_similar) {
        const similarBooks = await findSimilarBooks(args.name, bookstackApi, args.similarity_threshold);
        
        if (similarBooks.length > 0) {
            // Ähnliche Bücher gefunden, Informationen zurückgeben
            let response = `Es wurden ${similarBooks.length} ähnliche Bücher gefunden:\n\n`;
            
            similarBooks.forEach((book: BookDetails, index: number) => {
                response += `${index + 1}. **${book.name}** (ID: ${book.id})\n`;
                if (book.description) {
                    response += `   Beschreibung: ${book.description.substring(0, 100)}${book.description.length > 100 ? '...' : ''}\n`;
                }
                if (book.url) {
                    response += `   URL: ${book.url}\n`;
                }
                response += '\n';
            });
            
            response += `\nUm ein bestehendes Buch zu aktualisieren, verwenden Sie bitte das Tool 'buch_aktualisieren' mit der entsprechenden Buch-ID.\n`;
            response += `Um trotzdem ein neues Buch zu erstellen, setzen Sie 'check_similar: false' in den Argumenten.`;
            
            return response;
        }
    }
    
    // Kein ähnliches Buch gefunden oder Prüfung deaktiviert, neues Buch erstellen
    const apiPayload: CreateBookApiPayload = {
        name: args.name,
        description: args.description,
        tags: args.tags ? args.tags.map(t => ({ name: t.name, value: t.value })) : undefined
    };

    const book = await bookstackApi.createBook(apiPayload);

    // Format Response
    // TODO: i18n
    return `Buch erfolgreich erstellt.\nID: ${book.id}\nName: ${book.name}\nURL: ${book.url || 'N/A'}`;
}