import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import type { ToolSchema } from '@modelcontextprotocol/sdk/types.js'; // Nicht mehr benötigt
import { CreatePageToolArgsSchema, tagSchema } from '../common/schemas_tools.js';
import { BookStackAPI } from '../services/bookstack_api.js';
import { loadStyleGuideConfig } from '../config/styleguide.js';
import { generateStyledMarkdown } from './markdown_generator.js';
import { generateAutoTags } from './tag_generator.js';
import type { CreatePageApiPayload, BookstackSearchItem } from '../common/schemas_api.js';
import type { Tag } from '../common/types.js';
import { findSimilarPages } from '../common/utils.js';

// KEINE explizite Typ-Annotation mehr!
export const createPageToolSchema = {
    name: "seite_erstellen",
    description: "Erstellt eine neue Seite in Bookstack mit strukturiertem Inhalt und optionaler Styleguide-Anwendung.",
    inputSchema: zodToJsonSchema(CreatePageToolArgsSchema)
};
// Handler Function
export async function handleCreatePage(
    args: z.infer<typeof CreatePageToolArgsSchema>,
    bookstackApi: BookStackAPI
): Promise<string> {
    // Prüfen, ob ähnliche Seiten existieren, falls gewünscht
    if (args.check_similar) {
        const similarPages = await findSimilarPages(args.page_title, args.book_id, bookstackApi, args.similarity_threshold);
        
        if (similarPages.length > 0) {
            // Ähnliche Seiten gefunden, Informationen zurückgeben
            let response = `Es wurden ${similarPages.length} ähnliche Seiten gefunden:\n\n`;
            
            similarPages.forEach((page: BookstackSearchItem, index: number) => {
                response += `${index + 1}. **${page.name}** (ID: ${page.id})\n`;
                if (page.book) {
                    response += `   Buch: ${page.book.name} (ID: ${page.book.id})\n`;
                }
                if (page.preview_html?.content) {
                    const preview = page.preview_html.content.substring(0, 100) + (page.preview_html.content.length > 100 ? '...' : '');
                    response += `   Vorschau: ${preview}\n`;
                }
                if (page.url) {
                    response += `   URL: ${page.url}\n`;
                }
                response += '\n';
            });
            
            response += `\nUm eine bestehende Seite zu aktualisieren, verwenden Sie bitte das Tool 'seite_aktualisieren' mit der entsprechenden Seiten-ID.\n`;
            response += `Um trotzdem eine neue Seite zu erstellen, setzen Sie 'check_similar: false' in den Argumenten.`;
            
            return response;
        }
    }

    const styleConfig = loadStyleGuideConfig();

    // 1. Load template if specified
    let baseMarkdown = "";
    if (args.template_id) {
        try {
            const template = await bookstackApi.getPage(args.template_id);
            if (!template.markdown) {
                throw new Error("Template page has no markdown content");
            }
            baseMarkdown = template.markdown;
        } catch (error) {
            return `Fehler beim Laden der Vorlage (ID: ${args.template_id}): ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    // 2. Generate Markdown (will be merged with template if exists)
    const generatedMarkdown = generateStyledMarkdown(args, styleConfig, baseMarkdown);

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