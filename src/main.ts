#!/usr/bin/env node
import dotenv from 'dotenv';
import { BookStackMcpServer } from './server.js';
import { createRequire } from 'node:module'; // Für package.json Zugriff in ES Modulen

// Lade Umgebungsvariablen aus .env Datei
dotenv.config();

// Version aus package.json lesen (optional, aber nett)
const require = createRequire(import.meta.url);
let version = 'unknown';
try {
    const pkg = require('../package.json');
    version = pkg.version || 'unknown';
} catch (e) {
    console.error("Could not read package.json for version.", e);
}


// Server Instanz erstellen und starten
const server = new BookStackMcpServer(version);
server.run().catch((error) => {
    console.error("Failed to run Bookstack MCP server:", error);
    process.exit(1);
});