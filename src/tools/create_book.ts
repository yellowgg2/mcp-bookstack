import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js'; // Nicht mehr benötigt für Annotation
import { CreateBookArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import type { CreateBookApiPayload } from '../common/schemas_api.js';

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