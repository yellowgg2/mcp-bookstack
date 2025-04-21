import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js';
import { CreatePageToolArgsSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import { loadStyleGuideConfig } from '../config/styleguide.js';
import { generateStyledMarkdown } from './markdown_generator.js';
import { generateAutoTags } from './tag_generator.js';
import type { CreatePageApiPayload } from '../common/schemas_api.js';
import type { Tag } from '../common/types.js';

export const createPageToolSchema: ToolSchema = {
    name: "seite_erstellen",
    description: "Erstellt eine neue Seite in Bookstack mit strukturiertem Inhalt und optionaler Styleguide-Anwendung.",
    inputSchema: zodToJsonSchema(CreatePageToolArgsSchema)
};

// Handler Function
export async function handleCreatePage(
    args: z.infer<typeof CreatePageToolArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    const styleConfig = loadStyleGuideConfig();

    // 1. Generate Markdown
    const generatedMarkdown = generateStyledMarkdown(args, styleConfig);

    // 2. Generate Tags (Auto + Manual)
    const autoTags: Tag[] = generateAutoTags(args.page_title, generatedMarkdown, styleConfig);
    const finalTags: Tag[] = [...(args.tags || []), ...autoTags];
    // Simple deduplication by tag name
    const uniqueTags = [...new Map(finalTags.map(tag => [tag.name.toLowerCase(), tag])).values()];

    // 3. Prepare API Payload
    const apiPayload: CreatePageApiPayload = {
        book_id: args.book_id,
        name: args.page_title, // Verwende page_title für den Seitennamen
        markdown: generatedMarkdown,
        tags: uniqueTags.length > 0 ? uniqueTags.map(t => ({ name: t.name, value: t.value })) : undefined, // Konvertiere zu API Payload Schema
        chapter_id: args.chapter_id
    };

    // 4. Call API
    const page = await bookstackApi.createPage(apiPayload);

    // 5. Format Response
    // TODO: Use i18n here if implemented
    const lang = args.sprache || process.env.MCP_DEFAULT_LANGUAGE || 'de'; // Beispiel für Sprachauswahl
    // Basierend auf lang könnte man unterschiedliche Antworttexte generieren
    return `Seite erfolgreich in Buch ${page.book_id} erstellt.\nID: ${page.id}\nName: ${page.name}\nURL: ${page.url || 'N/A'}`;
}