import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js';
import { SearchPagesArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';

export const searchPagesToolSchema: ToolSchema = {
    name: "seiten_suchen", // German name
    description: "Sucht Seiten in Bookstack anhand einer Suchanfrage. Gibt Titel, URL und Vorschau zurück.",
    inputSchema: zodToJsonSchema(SearchPagesArgsSchema)
};

export async function handleSearchPages(
    args: z.infer<typeof SearchPagesArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    const searchResult = await bookstackApi.searchPages(args.query, args.page, args.count);

    if (!searchResult.data || searchResult.data.length === 0) {
        return "Keine Seiten für diese Anfrage gefunden.";
    }

    // Optional: Hier könnte man noch für jede gefundene Seite die vollen Daten holen,
    // aber das kann langsam sein und wird hier erstmal weggelassen.
    // Wir geben die Infos aus der Suche zurück.
    const responseText = searchResult.data
        .map(
            (page) =>
                `### ${page.name} (ID: ${page.id})\n` +
                `**Buch:** ${page.book?.name || 'Unbekannt'}\n` +
                `**URL:** ${page.url}\n` +
                `**Vorschau:** ${page.preview_html?.content?.substring(0, 200) || '(Keine Vorschau)'}...\n---`
        )
        .join("\n\n");

    return responseText;
}