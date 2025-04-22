import { z } from 'zod';
import { CreatePageToolArgsSchema, UpdatePageToolArgsSchema } from '../common/schemas_tools.js';
import type { StyleGuideConfig } from '../config/styleguide.js';
import type { Section } from '../common/types.js'; // Stelle sicher, dass dies die aktualisierte Section importiert

type MarkdownGeneratorArgs = z.infer<typeof CreatePageToolArgsSchema> | z.infer<typeof UpdatePageToolArgsSchema>;

export function generateStyledMarkdown(args: MarkdownGeneratorArgs, config: StyleGuideConfig): string {
    let markdown = "";
    const title = 'page_title' in args ? args.page_title : undefined;

    // --- Logo & Haupttitel --- (wie vorher)
    if (args.include_logo && config.logoMarkdown) { markdown += config.logoMarkdown + "\n\n"; }
    if (title) { markdown += `${config.headingLevel1} ${title}\n\n`; }

    // --- Abschnitte ---
    args.sections.forEach((section: Section) => { // 'section' sollte jetzt den Typ mit allen enum-Werten haben
        let prefix = '';
        // Dieser Switch sollte jetzt alle Fälle aus dem enum kennen
        switch (section.type) {
            case 'info':
                prefix = config.infoPrefix;
                break;
            case 'warning':
                prefix = config.warningPrefix;
                break;
            case 'success': // Dieser Fall muss vom Typ erlaubt sein
                prefix = config.successPrefix;
                break;
            case 'danger': // Dieser Fall muss vom Typ erlaubt sein
                prefix = config.dangerPrefix;
                break;
            case 'normal': // Fallback für 'normal' oder undefined (wegen .optional().default())
            default:
                prefix = '';
                break;
        }

        const sectionTitle = section.title.trim();
        if (sectionTitle) {
           markdown += `${config.headingLevel2} ${prefix}${sectionTitle}\n\n`;
        }
        markdown += section.content + "\n\n";
    });

    // --- Footer ---
    if (config.autoLegalFooterEnabled) {
        // Füge sicherheitshalber eine Leerzeile vor dem Footer hinzu
        if (markdown && !markdown.endsWith('\n\n')) {
            markdown += '\n';
        }
        // Füge statischen Teil hinzu (falls vorhanden)
        if (config.legalFooterMarkdown) {
            markdown += config.legalFooterMarkdown + "\n";
        }

        // Füge dynamische Metadaten hinzu (falls vom Client übergeben)
        const timestamp = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        let metaInfo = `Zuletzt geändert/erstellt: ${timestamp}`; // Zeitstempel immer hinzufügen

        if (args.erstellt_von_benutzer) {
            metaInfo += ` durch ${args.erstellt_von_benutzer}`;
        }
        if (args.verwendeter_client) {
            metaInfo += ` (Client: ${args.verwendeter_client})`;
        }
        if (args.verwendete_ki) {
            metaInfo += ` (KI: ${args.verwendete_ki})`;
        }
        // Füge die Metadaten-Zeile hinzu (z.B. als kleiner Text oder Code-Block)
        // Hier als einfacher Text mit vorangestelltem `> ` für eine leichte Abhebung
        markdown += `> ${metaInfo}\n`;
    }

    return markdown.trim();
}