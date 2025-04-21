import { z } from 'zod';
import { CreatePageToolArgsSchema, UpdatePageToolArgsSchema } from '../common/schemas_tools.js';
import type { StyleGuideConfig } from '../config/styleguide.js';
import type { Section } from '../common/types.js';

type MarkdownGeneratorArgs = z.infer<typeof CreatePageToolArgsSchema> | z.infer<typeof UpdatePageToolArgsSchema>;

export function generateStyledMarkdown(args: MarkdownGeneratorArgs, config: StyleGuideConfig): string {
    let markdown = "";
    const title = 'page_title' in args ? args.page_title : undefined; // Titel aus Create oder Update Args holen

    if (args.include_logo && config.logoMarkdown) {
        markdown += config.logoMarkdown + "\n\n";
    }

    if (title) {
       markdown += `${config.headingLevel1} ${title}\n\n`;
    }

    args.sections.forEach((section: Section) => { // Expliziter Typ für section
        let icon = '';
        if (section.type === 'info') icon = config.infoIcon + ' ';
        if (section.type === 'warning') icon = config.warnIcon + ' ';

        markdown += `${config.headingLevel2} ${icon}${section.title}\n\n`;
        markdown += section.content + "\n\n"; // Füge den übergebenen Markdown-Inhalt des Abschnitts hinzu
    });

    if (config.autoLegalFooterEnabled && config.legalFooterMarkdown) {
        markdown += config.legalFooterMarkdown + "\n";
    }

    return markdown.trim();
}