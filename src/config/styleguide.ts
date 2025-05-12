export interface StyleGuideConfig {
    headingLevel1: string;
    headingLevel2: string;
    logoMarkdown: string;

    infoPrefix: string;
    warningPrefix: string;
    successPrefix: string;
    dangerPrefix: string;

    legalFooterMarkdown: string;
    autoLegalFooterEnabled: boolean;
    autoTagsEnabled: boolean;
    autoTagsKeywords: string[];
}

// Lädt die Konfiguration aus Umgebungsvariablen
// Funktion zum Laden der Konfiguration

export function loadStyleGuideConfig(): StyleGuideConfig {
    const autoTagsKeywordsRaw = process.env.AUTO_TAGS_KEYWORDS || '';
    const autoTagsKeywords = autoTagsKeywordsRaw ? autoTagsKeywordsRaw.split(',').map(k => k.trim()).filter(k => k) : [];

    // Das zurückgegebene Objekt muss exakt der Struktur von StyleGuideConfig entsprechen
    return {
        // Überschriften
        headingLevel1: process.env.STYLEGUIDE_HEADING_LEVEL_1 || '##',
        headingLevel2: process.env.STYLEGUIDE_HEADING_LEVEL_2 || '###',

        // Logo
        logoMarkdown: process.env.STYLEGUIDE_LOGO_MARKDOWN || '',

        // --- Standard-Prefixe ---
        // Diese Eigenschaften müssen oben im Interface definiert sein
        infoPrefix: process.env.STYLEGUIDE_INFO_PREFIX || ':information_source: **Info:** ',
        warningPrefix: process.env.STYLEGUIDE_WARN_PREFIX || ':warning: **Warnung:** ',
        successPrefix: process.env.STYLEGUIDE_SUCCESS_PREFIX || ':white_check_mark: **Erfolg:** ',
        dangerPrefix: process.env.STYLEGUIDE_DANGER_PREFIX || ':x: **Achtung:** ',

        // Rechtliches
        legalFooterMarkdown: process.env.STYLEGUIDE_LEGAL_FOOTER_MD || '',
        autoLegalFooterEnabled: (process.env.AUTO_LEGAL_FOOTER_ENABLED || 'false').toLowerCase() === 'true',

        // Auto-Tags
        autoTagsEnabled: (process.env.AUTO_TAGS_ENABLED || 'false').toLowerCase() === 'true',
        autoTagsKeywords: autoTagsKeywords,
    };
}