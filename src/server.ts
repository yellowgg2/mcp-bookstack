import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';

// Service und Config
import { BookStackAPI } from './services/bookstack_api.js';
import { loadStyleGuideConfig } from './config/styleguide.js';

// Tool Schemas und Handler importieren
import { searchPagesToolSchema, handleSearchPages } from './tools/search_pages.js';
import { getPageContentToolSchema, handleGetPageContent } from './tools/get_page_content.js'; // Annahme: diese Datei existiert
import { createBookToolSchema, handleCreateBook } from './tools/create_book.js'; // Annahme: diese Datei existiert
import { createPageToolSchema, handleCreatePage } from './tools/create_page.js';
import { updatePageToolSchema, handleUpdatePage } from './tools/update_page.js'; // Annahme: diese Datei existiert

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
    // private styleConfig: StyleGuideConfig; // Config wird bei Bedarf in Handlern geladen

    constructor(serverVersion: string = '1.2.0') {
        const baseUrl = process.env.BOOKSTACK_API_URL;
        const token = process.env.BOOKSTACK_API_TOKEN;
        const secret = process.env.BOOKSTACK_API_KEY;

        if (!baseUrl || !token || !secret) {
            console.error("FATAL: BookStack API URL, Token, or Key not configured in environment variables.");
            process.exit(1);
        }

        this.server = new Server({ name: "bookstack-mcp-server", version: serverVersion }, { capabilities: { tools: {} } });
        this.bookstackApi = new BookStackAPI(baseUrl, token, secret, serverVersion);
        // this.styleConfig = loadStyleGuideConfig(); // Config bei Bedarf laden

        this.setupToolHandlers();

        this.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => { await this.server.close(); process.exit(0); });
    }

    private setupToolHandlers() {
        // ListTools Handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [ // Füge hier alle importierten ToolSchemas hinzu
                    searchPagesToolSchema,
                    getPageContentToolSchema,
                    createBookToolSchema,
                    createPageToolSchema,
                    updatePageToolSchema,
                ]
            };
        });

        // CallTool Handler
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            console.error(`Received tool call: ${name}`, args);

            try {
                let resultText: string;

                switch (name) {
                    case searchPagesToolSchema.name: { // Verwende Namen aus Schema
                        const parsedArgs = SearchPagesArgsSchema.parse(args);
                        resultText = await handleSearchPages(parsedArgs, this.bookstackApi);
                        break;
                    }
                     case getPageContentToolSchema.name: {
                         const parsedArgs = GetPageContentArgsSchema.parse(args);
                         // Annahme: handleGetPageContent gibt JSON-String zurück oder einfachen Text
                         const resultData = await handleGetPageContent(parsedArgs, this.bookstackApi);
                         resultText = typeof resultData === 'string' ? resultData : JSON.stringify(resultData);
                         break;
                     }
                     case createBookToolSchema.name: {
                         const parsedArgs = CreateBookArgsSchema.parse(args);
                         resultText = await handleCreateBook(parsedArgs, this.bookstackApi);
                         break;
                     }
                    case createPageToolSchema.name: {
                        const parsedArgs = CreatePageToolArgsSchema.parse(args);
                        resultText = await handleCreatePage(parsedArgs, this.bookstackApi);
                        break;
                    }
                     case updatePageToolSchema.name: {
                         const parsedArgs = UpdatePageToolArgsSchema.parse(args);
                         resultText = await handleUpdatePage(parsedArgs, this.bookstackApi);
                         break;
                     }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool name: ${name}`);
                }

                return { content: [{ type: "text", text: resultText }] };

            } catch (error) {
                if (error instanceof McpError) {
                    // Fehler von der API oder interne MCP Fehler weitergeben
                    throw error;
                } else if (error instanceof z.ZodError) {
                    // Fehler bei der Argumentvalidierung
                    const message = `Invalid arguments for tool ${name}: ${JSON.stringify(error.errors)}`;
                    console.error(`[Request Error] ${message}`);
                    throw new McpError(ErrorCode.InvalidParams, message);
                } else {
                    // Andere unerwartete Fehler
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(`[Unexpected Error] Tool call ${name} failed:`, error);
                    throw new McpError(ErrorCode.InternalError, `An unexpected error occurred while executing tool ${name}: ${message}`);
                }
            }
        }); // Ende CallToolRequestSchema Handler
    } // Ende setupToolHandlers

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error(`BookStack MCP server running on stdio. Base URL: ${this.bookstackApi['baseUrl'] || 'N/A'}`); // Indirekter Zugriff falls baseUrl private
    }
}