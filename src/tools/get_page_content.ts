import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js'; // Nicht mehr benötigt
import { GetPageContentArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import { htmlToPlainText } from '../common/utils.js';

// KEINE explizite Typ-Annotation mehr!
export const getPageContentToolSchema = {
    name: "seiteninhalt_abrufen",
    description: "Ruft den vollständigen Inhalt (Markdown bevorzugt) einer bestimmten Seite anhand ihrer ID ab.",
    inputSchema: zodToJsonSchema(GetPageContentArgsSchema)
};
// Handler Function
export async function handleGetPageContent(
    args: z.infer<typeof GetPageContentArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> { // Gibt JSON String zurück
    const pageData = await bookstackApi.getPage(args.page_id);
    const content = pageData.markdown || htmlToPlainText(pageData.html || pageData.raw_html || '');
    const format = pageData.markdown ? 'markdown' : 'plaintext';

    // Gib das Ergebnis als JSON-String zurück, damit der Client Format und Inhalt hat
    return JSON.stringify({
        page_id: args.page_id,
        format: format,
        content: content,
        name: pageData.name, // Zusätzliche Info
        url: pageData.url || 'N/A' // Zusätzliche Info
    });
}