import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// ToolSchema Type wird hier nicht mehr explizit für Annotationen gebraucht
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';

// Service und Config
import { BookStackAPI } from './services/bookstack_api.js';

// Tool Schemas und Handler importieren (diese sind jetzt Objekte mit abgeleitetem Typ)
import { searchPagesToolSchema, handleSearchPages } from './tools/search_pages.js';
import { getPageContentToolSchema, handleGetPageContent } from './tools/get_page_content.js';
import { createBookToolSchema, handleCreateBook } from './tools/create_book.js';
import { createPageToolSchema, handleCreatePage } from './tools/create_page.js';
import { updatePageToolSchema, handleUpdatePage } from './tools/update_page.js';

// Tool Argument Schemas (nur zum Parsen benötigt)
import {
    SearchPagesArgsSchema,
    GetPageContentArgsSchema,
    CreateBookArgsSchema,
    CreatePageToolArgsSchema,
    UpdatePageToolArgsSchema
} from './common/schemas_tools.js';


export class BookStackMcpServer {
    private server: Server;
    private bookstackApi: BookStackAPI;
    private serverVersion: string;

    constructor(serverVersion: string = '1.2.0') {
        // ... (Konstruktor-Implementierung wie vorher) ...
        this.serverVersion = serverVersion;
        const baseUrl = process.env.BOOKSTACK_API_URL;
        const token = process.env.BOOKSTACK_API_TOKEN;
        const secret = process.env.BOOKSTACK_API_KEY;

        if (!baseUrl || !token || !secret) {
            console.error("FATAL: BookStack API URL, Token, or Key not configured in environment variables.");
            process.exit(1);
        }

        this.server = new Server({ name: "bookstack-mcp-server", version: this.serverVersion }, { capabilities: { tools: {} } });
        this.bookstackApi = new BookStackAPI(baseUrl, token, secret, this.serverVersion);

        this.setupToolHandlers();

        this.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => { await this.server.close(); process.exit(0); });
    }

    private setupToolHandlers() {
        // ListTools Handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
             // Array ohne explizite Typ-Annotation erstellen
            const tools = [
                searchPagesToolSchema,
                getPageContentToolSchema,
                createBookToolSchema,
                createPageToolSchema,
                updatePageToolSchema,
            ];
            // TypeScript prüft strukturell, ob die zurückgegebenen Objekte
            // zur erwarteten Signatur des Handlers passen.
            return { tools };
        });

        // CallTool Handler
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            // ... (Implementierung wie vorher, verwendet die Namen aus den importierten Schemas) ...
             const { name, arguments: args } = request.params;
             console.error(`[${new Date().toISOString()}] Received tool call: ${name}`, args);
             try {
                let resultText: string;
                switch (name) {
                    case searchPagesToolSchema.name: { const parsedArgs = SearchPagesArgsSchema.parse(args); resultText = await handleSearchPages(parsedArgs, this.bookstackApi); break; }
                    case getPageContentToolSchema.name: { const parsedArgs = GetPageContentArgsSchema.parse(args); resultText = await handleGetPageContent(parsedArgs, this.bookstackApi); break; }
                    case createBookToolSchema.name: { const parsedArgs = CreateBookArgsSchema.parse(args); resultText = await handleCreateBook(parsedArgs, this.bookstackApi); break; }
                    case createPageToolSchema.name: { const parsedArgs = CreatePageToolArgsSchema.parse(args); resultText = await handleCreatePage(parsedArgs, this.bookstackApi); break; }
                    case updatePageToolSchema.name: { const parsedArgs = UpdatePageToolArgsSchema.parse(args); resultText = await handleUpdatePage(parsedArgs, this.bookstackApi); break; }
                    default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool name: ${name}`);
                }
                console.error(`[${new Date().toISOString()}] Tool call ${name} completed successfully.`);
                try { JSON.parse(resultText); return { content: [{ type: "text", text: resultText }] }; }
                catch (e) { return { content: [{ type: "text", text: resultText }] }; }
             } catch (error) {
                if (error instanceof McpError) { console.error(`[${new Date().toISOString()}] MCP Error during ${name}: ${error.code} - ${error.message}`); throw error; }
                else if (error instanceof z.ZodError) { const message = `Invalid arguments for tool ${name}: ${JSON.stringify(error.errors)}`; console.error(`[${new Date().toISOString()}] Request Error: ${message}`); throw new McpError(ErrorCode.InvalidParams, message); }
                else { const message = error instanceof Error ? error.message : String(error); console.error(`[${new Date().toISOString()}] Unexpected Error during ${name}:`, error); throw new McpError(ErrorCode.InternalError, `An unexpected error occurred while executing tool ${name}: ${message}`); }
             }
        });
    }

    async run() {
        // ... (Implementierung wie vorher) ...
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        const baseUrl = (this.bookstackApi as any)['baseUrl'] || 'N/A';
        console.error(`BookStack MCP server v${this.serverVersion} running on stdio. Base URL: ${baseUrl}`);
    }
}