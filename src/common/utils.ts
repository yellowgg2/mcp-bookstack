import { BookDetails, BookstackSearchItem } from './schemas_api.js';
import { BookStackAPI } from '../services/bookstack_api.js';

// Konvertiert einfaches HTML zu Plain Text
export function htmlToPlainText(html: string): string {
    if (!html) return '';
    let text = html
      .replace(/<style([\s\S]*?)<\/style>/gi, '')
      .replace(/<script([\s\S]*?)<\/script>/gi, '')
      .replace(/\s/gi, '')
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/^\s+|\s+$/g, '');
    return text.trim();
}

// Hilfsfunktion zur Normalisierung von Texten für Vergleiche
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Entfernt Sonderzeichen
        .replace(/\s+/g, ' ')    // Ersetzt mehrere Leerzeichen durch eines
        .trim();
}

// Berechnet die Ähnlichkeit zwischen zwei Strings (0-1, wobei 1 identisch ist)
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    // Einfache Teilstring-Prüfung
    if (s1.includes(s2) || s2.includes(s1)) {
        const longerLength = Math.max(s1.length, s2.length);
        const shorterLength = Math.min(s1.length, s2.length);
        return shorterLength / longerLength;
    }
    
    // Levenshtein-Distanz für komplexere Vergleiche
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
}

// Levenshtein-Distanz-Implementierung
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Matrix erstellen
    const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Erste Zeile und Spalte initialisieren
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    
    // Matrix füllen
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,      // Löschen
                d[i][j - 1] + 1,      // Einfügen
                d[i - 1][j - 1] + cost // Ersetzen
            );
        }
    }
    
    return d[m][n];
}

// Findet ähnliche Bücher basierend auf dem Titel
export async function findSimilarBooks(bookTitle: string, bookstackApi: BookStackAPI, similarityThreshold: number = 0.7): Promise<BookDetails[]> {
    try {
        // Alle Bücher abrufen
        const booksResponse = await bookstackApi.getBooks();
        if (!booksResponse.data || booksResponse.data.length === 0) {
            return [];
        }
        
        // Nach ähnlichen Büchern suchen
        const similarBooks = booksResponse.data.filter((book: BookDetails) => {
            const similarity = calculateSimilarity(book.name, bookTitle);
            return similarity >= similarityThreshold;
        });
        
        return similarBooks;
    } catch (error) {
        console.error("Fehler beim Suchen ähnlicher Bücher:", error);
        return [];
    }
}

// Findet ähnliche Seiten basierend auf dem Titel
export async function findSimilarPages(pageTitle: string, bookId: number, bookstackApi: BookStackAPI, similarityThreshold: number = 0.7): Promise<BookstackSearchItem[]> {
    try {
        // Suche nach Seiten mit ähnlichem Titel
        const searchResponse = await bookstackApi.searchPages(pageTitle, 1, 20);
        if (!searchResponse.data || searchResponse.data.length === 0) {
            return [];
        }
        
        // Nach ähnlichen Seiten suchen und nach Buch filtern, falls bookId angegeben
        const similarPages = searchResponse.data.filter((page: BookstackSearchItem) => {
            const similarity = calculateSimilarity(page.name, pageTitle);
            const inSameBook = bookId ? page.book_id === bookId : true;
            return similarity >= similarityThreshold && inSameBook;
        });
        
        return similarPages;
    } catch (error) {
        console.error("Fehler beim Suchen ähnlicher Seiten:", error);
        return [];
    }
}