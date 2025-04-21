import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js'; // Nicht mehr benötigt
import { UpdatePageToolArgsSchema, tagSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import { loadStyleGuideConfig } from '../config/styleguide.js';
import { generateStyledMarkdown } from './markdown_generator.js';
import { generateAutoTags } from './tag_generator.js';
import type { UpdatePageApiPayload } from '../common/schemas_api.js';
import type { Tag } from '../common/types.js';

// KEINE explizite Typ-Annotation mehr!
export const updatePageToolSchema = {
    name: "seite_aktualisieren",
    description: "Aktualisiert eine bestehende Seite in Bookstack mit strukturiertem Inhalt und optionaler Styleguide-Anwendung. Ersetzt den *gesamten* Inhalt.",
    inputSchema: zodToJsonSchema(UpdatePageToolArgsSchema)
};

// Handler Function
export async function handleUpdatePage(
    args: z.infer<typeof UpdatePageToolArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> { // Returns the result text
    const styleConfig = loadStyleGuideConfig();

    // 1. Generate Markdown
    const generatedMarkdown = generateStyledMarkdown(args, styleConfig);

    // 2. Generate Tags (Auto + Manual)
    const autoTags: Tag[] = generateAutoTags(args.page_title, generatedMarkdown, styleConfig);
    const finalTags: Tag[] = [...(args.tags || []), ...autoTags];
    // Simple deduplication by tag name
    const uniqueTags = [...new Map(finalTags.map(tag => [tag.name.toLowerCase(), tag])).values()];

    // 3. Prepare API Payload
    const apiPayload: UpdatePageApiPayload = {
        // Nur den Namen senden, wenn er im Input auch angegeben wurde
        ...(args.page_title && { name: args.page_title }),
        markdown: generatedMarkdown,
        // Nur Tags senden, wenn welche vorhanden sind (ersetzt alle bestehenden in BookStack)
        tags: uniqueTags.length > 0 ? uniqueTags.map(t => ({ name: t.name, value: t.value })) : undefined,
    };

    // 4. Call API
    const page = await bookstackApi.updatePage(args.page_id, apiPayload);

    // 5. Format Response
    // TODO: i18n
    const lang = args.sprache || process.env.MCP_DEFAULT_LANGUAGE || 'de';
    return `Seite ${page.id} erfolgreich aktualisiert.\nName: ${page.name}\nURL: ${page.url || 'N/A'}`;
}