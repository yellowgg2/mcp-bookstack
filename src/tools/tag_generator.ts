import type { StyleGuideConfig } from '../config/styleguide.js';
import type { Tag } from '../common/types.js';

export function generateAutoTags(title: string | undefined, content: string, config: StyleGuideConfig): Tag[] {
    if (!config.autoTagsEnabled || config.autoTagsKeywords.length === 0) {
        return [];
    }

    const generatedTags: Tag[] = [];
    const combinedText = ((title || '') + ' ' + content).toLowerCase();

    config.autoTagsKeywords.forEach(keyword => {
        // Einfache Keyword-Prüfung (Wortgrenzen optional)
        // Man könnte hier komplexere Logik oder Regex verwenden
        const regex = new RegExp(`\\b${keyword}\\b`, 'i'); // Suche nach ganzen Wörtern (case-insensitive durch toLowerCase oben)
        if (combinedText.includes(keyword)) { // Einfacher Check, ob das Keyword vorkommt
             // Finde die ursprüngliche Schreibweise des Keywords für den Tag-Namen
             const originalKeyword = process.env.AUTO_TAGS_KEYWORDS?.split(',').find(k => k.trim().toLowerCase() === keyword)?.trim() || keyword;
            generatedTags.push({ name: originalKeyword }); // Füge Tag hinzu (ohne Wert)
        }
    });

    return generatedTags;
}