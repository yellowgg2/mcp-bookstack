export interface StyleGuideConfig {
    headingLevel1: string;
    headingLevel2: string;
    logoMarkdown: string;
    infoIcon: string;
    warnIcon: string;
    legalFooterMarkdown: string;
    autoLegalFooterEnabled: boolean;
    autoTagsEnabled: boolean;
    autoTagsKeywords: string[];
}

// Lädt die Konfiguration aus Umgebungsvariablen
export function loadStyleGuideConfig(): StyleGuideConfig {
    const autoTagsKeywordsRaw = process.env.AUTO_TAGS_KEYWORDS || '';
    return {
        headingLevel1: process.env.STYLEGUIDE_HEADING_LEVEL_1 || '##',
        headingLevel2: process.env.STYLEGUIDE_HEADING_LEVEL_2 || '###',
        logoMarkdown: process.env.STYLEGUIDE_LOGO_MARKDOWN || '',
        infoIcon: process.env.STYLEGUIDE_INFO_ICON || ':information_source:',
        warnIcon: process.env.STYLEGUIDE_WARN_ICON || ':warning:',
        legalFooterMarkdown: process.env.STYLEGUIDE_LEGAL_FOOTER_MD || '',
        autoLegalFooterEnabled: (process.env.AUTO_LEGAL_FOOTER_ENABLED || 'false').toLowerCase() === 'true',
        autoTagsEnabled: (process.env.AUTO_TAGS_ENABLED || 'false').toLowerCase() === 'true',
        autoTagsKeywords: autoTagsKeywordsRaw ? autoTagsKeywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [],
    };
}