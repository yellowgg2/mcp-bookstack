#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolSchema } from "@modelcontextprotocol/sdk/types.js"; // Typ-Import bleibt
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  // ToolSchema hier entfernt
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from "dotenv";

dotenv.config();

// --- Zod Schemas ---

// -- Helper Schemas --
const tagSchema = z.object({
    name: z.string().describe("Tag name"),
    value: z.string().optional().describe("Optional tag value")
});

// -- API Response Schemas (Beispiele, ggf. anpassen) --
const bookstackSearchPageSchema = z.object({ id: z.number(), name: z.string(), slug: z.string(), book_id: z.number(), priority: z.number(), created_at: z.string(), updated_at: z.string(), url: z.string(), type: z.string(), tags: z.array( z.object({ name: z.string(), value: z.string().optional().nullable(), order: z.number().optional().nullable(), highlight_name: z.boolean().optional().nullable() }) ).optional().nullable(), book: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(), preview_html: z.object({ name: z.string(), content: z.string() }).optional().nullable() });
const bookstackSearchResponseSchema = z.object({ data: z.array(bookstackSearchPageSchema) });
const bookstackPageDataSchema = z.object({ id: z.number(), book_id: z.number(), chapter_id: z.number().nullable(), name: z.string(), slug: z.string(), html: z.string().optional(), markdown: z.string().optional(), priority: z.number(), created_at: z.string(), updated_at: z.string(), created_by: z .object({ id: z.number(), name: z.string(), slug: z.string() }) .optional() .nullable(), updated_by: z .object({ id: z.number(), name: z.string(), slug: z.string() }) .optional() .nullable(), draft: z.boolean().optional().nullable(), revision_count: z.number().optional().nullable(), template: z.boolean().optional().nullable(), owned_by: z.object({ id: z.number(), name: z.string(), slug: z.string() }).optional().nullable(), editor: z.string().optional().nullable(), raw_html: z.string().optional().nullable(), tags: z.array( z.object({ name: z.string(), value: z.string().optional().nullable(), order: z.number().optional().nullable(), highlight_name: z.boolean().optional().nullable() }) ).optional().nullable(), url: z.string().optional() });
const bookDetailsSchema = z.object({ id: z.number(), name: z.string(), slug: z.string(), description: z.string().optional().nullable(), created_at: z.string(), updated_at: z.string(), created_by: z.number().optional().nullable(), updated_by: z.number().optional().nullable(), owned_by: z.number().optional().nullable(), url: z.string().optional() });
type BookstackSearchResponse = z.infer<typeof bookstackSearchResponseSchema>;
type BookstackPageData = z.infer<typeof bookstackPageDataSchema>;
type BookDetails = z.infer<typeof bookDetailsSchema>;
type PageDetails = BookstackPageData;

// -- API Payload Schemas (Intern) --
const createBookApiPayloadSchema = z.object({ name: z.string(), description: z.string().optional(), tags: z.array(tagSchema).optional() });
const createPageApiPayloadSchema = z.object({ book_id: z.number(), name: z.string(), markdown: z.string(), tags: z.array(tagSchema).optional(), chapter_id: z.number().optional() });
const updatePageApiPayloadSchema = z.object({ name: z.string().optional(), markdown: z.string(), tags: z.array(tagSchema).optional() });
type CreateBookApiPayload = z.infer<typeof createBookApiPayloadSchema>;
type CreatePageApiPayload = z.infer<typeof createPageApiPayloadSchema>;
type UpdatePageApiPayload = z.infer<typeof updatePageApiPayloadSchema>;

// -- Tool Input Argument Schemas (Extern) --
const SearchPagesArgsSchema = z.object({
    query: z.string().default("").describe("Query string to search for pages. Can include Bookstack search terms like specific tags `[tag_name=tag_value]` or searching within a book `[book=book_slug]`."),
    page: z.number().min(1).optional().default(1).describe("Page number of results to return."),
    count: z.number().min(1).max(100).optional().default(10).describe("Number of pages to return per page (max typically 100, check Bookstack instance config)."),
});
const GetPageContentArgsSchema = z.object({
    page_id: z.number().describe("The unique numeric ID of the page to retrieve content for."),
});
const CreateBookArgsSchema = z.object({
    name: z.string().describe("The name for the new book."),
    description: z.string().optional().describe("Optional description for the book (plain text or Markdown)."),
    tags: z.array(tagSchema).optional().describe("Optional tags to assign to the book."),
});
const CreatePageToolArgsSchema = z.object({
    book_id: z.number().describe("The unique numeric ID of the book where the page should be created."),
    name: z.string().describe("The name/title for the new page."),
    markdown_content: z.string().describe("The full content of the page in Markdown format."), // Client uses 'markdown_content'
    chapter_id: z.number().optional().describe("Optional: The unique numeric ID of a chapter within the book to place the page under."),
    tags: z.array(tagSchema).optional().describe("Optional tags to assign to the page."),
});
const UpdatePageToolArgsSchema = z.object({
    page_id: z.number().describe("The unique numeric ID of the page to update."),
    markdown_content: z.string().describe("The new, full content for the page in Markdown format. This will overwrite the existing content."), // Client uses 'markdown_content'
    new_name: z.string().optional().describe("Optional: Provide a new name/title for the page."),
    tags: z.array(tagSchema).optional().describe("Optional: Provide a complete new set of tags for the page. This *replaces* all existing tags."),
});


class BookstackServer {
  private server: Server;
  private baseUrl: string | undefined = process.env.BOOKSTACK_API_URL;
  private token: string | undefined = process.env.BOOKSTACK_API_TOKEN;
  private secret: string | undefined = process.env.BOOKSTACK_API_KEY;

  constructor() {
    if (!this.baseUrl || !this.token || !this.secret) {
        console.error("FATAL: BookStack API URL, Token, or Key not configured in environment variables.");
        process.exit(1);
    }
    this.server = new Server({ name: "bookstack-mcp-server", version: "1.1.4" }, { capabilities: { tools: {} } }); // Version erhöht
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => { await this.server.close(); process.exit(0); });
  }

  // --- API Helper Functions ---
  private getApiHeaders(isJsonPayload: boolean = false) { const headers: Record<string, string> = { "Cache-Control": "no-cache", Accept: "application/json", "User-Agent": "Bookstack MCP Server v1.1.4", Connection: "keep-alive", Authorization: `Token ${this.token}:${this.secret}` }; if (isJsonPayload) { headers["Content-Type"] = "application/json"; } return headers; }
  private handleApiError(error: unknown, action: string): McpError { if (axios.isAxiosError(error)) { const status = error.response?.status; const responseData = error.response?.data; let message = `Failed to ${action}: ${error.message}`; if (status) { message += ` (Status: ${status})`; } if (responseData && typeof responseData === 'object') { const apiError = (responseData as any)?.error?.message || JSON.stringify(responseData); message += ` - API Error: ${apiError}`; } console.error(message, 'Request URL:', error.config?.url); if (status === 401 || status === 403) return new McpError(ErrorCode.InternalError, message); if (status === 404) return new McpError(ErrorCode.MethodNotFound, message); return new McpError(ErrorCode.InternalError, message); } else if (error instanceof z.ZodError) { const message = `Failed to parse API response for ${action}. Details: ${JSON.stringify(error.errors)}`; console.error(message); return new McpError(ErrorCode.InternalError, message); } else { const message = `An unexpected error occurred during ${action}: ${error}`; console.error(message); return new McpError(ErrorCode.InternalError, message); } }
  private async fetchBookstackPages(query: string, page: number, count: number): Promise<BookstackSearchResponse> { try { const searchQuery = query ? `${query}{type:page}` : '{type:page}'; const url = `${this.baseUrl}/api/search?query=${encodeURIComponent(searchQuery)}&page=${page}&count=${count}`; console.error(`GET ${url}`); const response = await axios.get(url, { headers: this.getApiHeaders() }); return bookstackSearchResponseSchema.parse(response.data); } catch (error) { throw this.handleApiError(error, `search pages with query "${query}"`); } }
  private async readBookstackPage(pageId: number): Promise<BookstackPageData> { try { const url = `${this.baseUrl}/api/pages/${pageId}`; console.error(`GET ${url}`); const response = await axios.get(url, { headers: this.getApiHeaders() }); return bookstackPageDataSchema.parse(response.data); } catch (error) { throw this.handleApiError(error, `read page ${pageId}`); } }
  private async createBookstackBook(payload: CreateBookApiPayload): Promise<BookDetails> { try { const url = `${this.baseUrl}/api/books`; console.error(`POST ${url}`, payload); const response = await axios.post(url, payload, { headers: this.getApiHeaders(true) }); return bookDetailsSchema.parse(response.data); } catch (error) { throw this.handleApiError(error, "create book"); } }
  private async createBookstackPage(payload: CreatePageApiPayload): Promise<PageDetails> { try { const url = `${this.baseUrl}/api/pages`; console.error(`POST ${url}`, payload); const response = await axios.post(url, payload, { headers: this.getApiHeaders(true) }); return bookstackPageDataSchema.parse(response.data); } catch (error) { throw this.handleApiError(error, "create page"); } }
  private async updateBookstackPage(pageId: number, payload: UpdatePageApiPayload): Promise<PageDetails> { try { const url = `${this.baseUrl}/api/pages/${pageId}`; console.error(`PUT ${url}`, payload); const response = await axios.put(url, payload, { headers: this.getApiHeaders(true) }); return bookstackPageDataSchema.parse(response.data); } catch (error) { throw this.handleApiError(error, `update page ${pageId}`); } }

  // --- Tool Setup ---
  private setupToolHandlers() {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        // Definiere die Struktur jedes Tools
        const searchPagesTool = {
          name: "search_pages",
          description: "Search pages within Bookstack based on a query string. Returns a list of matching pages with titles, URLs, and preview content.",
          inputSchema: zodToJsonSchema(SearchPagesArgsSchema)
        };
        const getPageContentTool = {
          name: "get_page_content",
          description: "Get the full content (preferably Markdown...) of a specific Bookstack page by its ID.",
          inputSchema: zodToJsonSchema(GetPageContentArgsSchema)
        };
        const createBookTool = {
          name: "create_book",
          description: "Create a new book in Bookstack.",
          inputSchema: zodToJsonSchema(CreateBookArgsSchema)
        };
        const createPageTool = {
          name: "create_page",
          description: "Create a new page within a specific Bookstack book using Markdown content.",
          inputSchema: zodToJsonSchema(CreatePageToolArgsSchema)
        };
        const updatePageTool = {
            name: "update_page",
            description: "Update an existing page in Bookstack. Replaces the *entire* page content...",
            inputSchema: zodToJsonSchema(UpdatePageToolArgsSchema)
        };

        // Lasse TypeScript den Typ des Arrays aus den Elementen ableiten.
        const tools = [ // <-- KEINE explizite Typ-Annotation ': ToolSchema[]' mehr
            searchPagesTool,
            getPageContentTool,
            createBookTool,
            createPageTool,
            updatePageTool,
        ];
        // TypeScript sollte erkennen, dass jedes Element strukturell kompatibel mit ToolSchema ist.
      return { tools };
    }); // Ende ListToolsRequestSchema Handler

    // Handler for executing a tool call
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`Received tool call: ${request.params.name}`, request.params.arguments);

      try {
          switch (request.params.name) {
              case "search_pages": {
                  const args = SearchPagesArgsSchema.parse(request.params.arguments);
                  const searchResult = await this.fetchBookstackPages(args.query, args.page, args.count);
                  if (!searchResult.data || searchResult.data.length === 0) { return { content: [{ type: "text", text: "No pages found matching the query." }] }; }
                  const pageContentsPromises = searchResult.data.map(async (page) => { try { const pageData = await this.readBookstackPage(page.id); const content = pageData.markdown || this.htmlToPlainText(pageData.html || pageData.raw_html || ''); return { id: page.id, title: page.name, url: pageData.url || page.url, content: content.substring(0, 1500) + (content.length > 1500 ? '...' : ''), bookName: page.book?.name || 'Unknown Book' }; } catch (readError) { console.error(`Failed to read details for page ${page.id} during search:`, readError); return { id: page.id, title: page.name, url: page.url, content: `Error fetching details: ${readError instanceof Error ? readError.message : 'Unknown error'}`, bookName: page.book?.name || 'Unknown Book' }; } });
                  const pageContents = await Promise.all(pageContentsPromises);
                  const responseText = pageContents.map(p => `### ${p.title} (ID: ${p.id})\n**Book:** ${p.bookName}\n**URL:** ${p.url}\n\n${p.content}\n---`).join("\n\n");
                  return { content: [{ type: "text", text: responseText }] };
              }

              case "get_page_content": {
                  const args = GetPageContentArgsSchema.parse(request.params.arguments);
                  const pageData = await this.readBookstackPage(args.page_id);
                  const content = pageData.markdown || this.htmlToPlainText(pageData.html || pageData.raw_html || '');
                  const format = pageData.markdown ? 'markdown' : 'plaintext';
                  return { content: [{ type: "text", text: JSON.stringify({ content: content, format: format, page_id: args.page_id }) }] };
              }

              case "create_book": {
                  const args = CreateBookArgsSchema.parse(request.params.arguments);
                  const apiPayload: CreateBookApiPayload = { name: args.name, description: args.description, tags: args.tags };
                  const book = await this.createBookstackBook(apiPayload);
                  return { content: [{ type: "text", text: `Book created successfully.\nID: ${book.id}\nName: ${book.name}\nURL: ${book.url || 'N/A'}` }] };
              }

              case "create_page": {
                  const toolArgs = CreatePageToolArgsSchema.parse(request.params.arguments);
                  const apiPayload: CreatePageApiPayload = { book_id: toolArgs.book_id, name: toolArgs.name, markdown: toolArgs.markdown_content, tags: toolArgs.tags, chapter_id: toolArgs.chapter_id };
                  const page = await this.createBookstackPage(apiPayload);
                  return { content: [{ type: "text", text: `Page created successfully in book ${page.book_id}.\nID: ${page.id}\nName: ${page.name}\nURL: ${page.url || 'N/A'}` }] };
              }

              case "update_page": {
                  const toolArgs = UpdatePageToolArgsSchema.parse(request.params.arguments);
                  const apiPayload: UpdatePageApiPayload = { markdown: toolArgs.markdown_content, ...(toolArgs.new_name && { name: toolArgs.new_name }), ...(toolArgs.tags && { tags: toolArgs.tags })};
                  const page = await this.updateBookstackPage(toolArgs.page_id, apiPayload);
                  return { content: [{ type: "text", text: `Page ${page.id} updated successfully.\nName: ${page.name}\nURL: ${page.url || 'N/A'}` }] };
              }

              default:
                  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool name: ${request.params.name}`);
          }
      } catch (error) {
            if (error instanceof McpError) {
                throw error;
            } else if (error instanceof z.ZodError) {
                const message = `Invalid arguments for tool ${request.params.name}: ${JSON.stringify(error.errors)}`;
                console.error(message);
                throw new McpError(ErrorCode.InvalidParams, message);
            } else {
                console.error(`Unexpected error during tool call ${request.params.name}:`, error);
                throw new McpError(ErrorCode.InternalError, `An unexpected error occurred while executing tool ${request.params.name}.`);
            }
      }
    }); // Ende CallToolRequestSchema Handler
  } // Ende setupToolHandlers

  private htmlToPlainText(html: string): string { if (!html) return ''; let text = html .replace(/<style([\s\S]*?)<\/style>/gi, '') .replace(/<script([\s\S]*?)<\/script>/gi, '') .replace(/\s/gi, '') .replace(/<br\s*\/?>/gi, "\n") .replace(/<\/p>/gi, "\n\n") .replace(/<\/div>/gi, "\n") .replace(/<\/h[1-6]>/gi, "\n\n") .replace(/<\/li>/gi, "\n") .replace(/<li[^>]*>/gi, "• ") .replace(/<[^>]+>/g, '') .replace(/&nbsp;/g, " ") .replace(/&amp;/g, "&") .replace(/&lt;/g, "<") .replace(/&gt;/g, ">") .replace(/&quot;/g, '"') .replace(/&#39;/g, "'"); text = text.replace(/[ \t]+/g, ' '); text = text.replace(/\n{3,}/g, '\n\n'); text = text.replace(/^\s+|\s+$/g, ''); return text.trim(); }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`BookStack MCP server v1.1.4 running on stdio. Base URL: ${this.baseUrl}`);
  }
} // Ende der BookstackServer Klasse

// --- Instantiate and Run the Server ---
const server = new BookstackServer();
server.run().catch((error) => {
    console.error("Failed to run Bookstack MCP server:", error);
    process.exit(1);
});