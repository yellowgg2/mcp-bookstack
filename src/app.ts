#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import z from "zod";
import dotenv from "dotenv";

dotenv.config();

const bookstackPageSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      book_id: z.number(),
      priority: z.number(),
      created_at: z.string(),
      updated_at: z.string(),
      url: z.string(),
      type: z.string(),
      tags: z.array(
        z.object({
          name: z.string(),
          value: z.string(),
          order: z.number(),
          highlight_name: z.boolean().optional().nullable()
        })
      ),
      book: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string()
      }),
      preview_html: z.object({
        name: z.string(),
        content: z.string()
      })
    })
  )
});

type BookstackPage = z.infer<typeof bookstackPageSchema>;

const bookstackPageDataSchema = z.object({
  id: z.number(),
  book_id: z.number(),
  chapter_id: z.number(),
  name: z.string(),
  slug: z.string(),
  html: z.string(),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z
    .object({
      id: z.number(),
      name: z.string(),
      slug: z.string()
    })
    .optional()
    .nullable(),
  updated_by: z
    .object({
      id: z.number(),
      name: z.string(),
      slug: z.string()
    })
    .optional()
    .nullable(),
  draft: z.boolean(),
  markdown: z.string(),
  revision_count: z.number(),
  template: z.boolean(),
  owned_by: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string()
  }),
  editor: z.string(),
  raw_html: z.string(),
  tags: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      order: z.number(),
      highlight_name: z.boolean().optional().nullable()
    })
  )
});

type BookstackPageData = z.infer<typeof bookstackPageDataSchema>;

class BookstackServer {
  private server: Server;
  private baseUrl = process.env.BOOKSTACK_API_URL;

  constructor() {
    this.server = new Server(
      {
        name: "hn-server",
        version: "0.1.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = error => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async fetchBookstackPages(
    query: string,
    page: number,
    count: number
  ): Promise<BookstackPage> {
    try {
      const url = `${this.baseUrl}/api/search?query=${encodeURIComponent(
        query
      )}{type:page}&page=${page}&count=${count}`;
      console.error(url);
      const response = await axios.get(url, {
        headers: {
          "Cache-Control": "no-cache",
          Accept: "*/*",
          "User-Agent": "Bookstack MCP",
          Connection: "keep-alive",
          Authorization: `Token ${process.env.BOOKSTACK_API_TOKEN}:${process.env.BOOKSTACK_API_KEY}`
        }
      });
      const bookstackPages = bookstackPageSchema.parse(response.data);
      return bookstackPages;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch bookstack pages: ${error.message}`
        );
      }
      throw error;
    }
  }

  private async readBookstackPage(pageId: number): Promise<BookstackPageData> {
    try {
      const url = `${this.baseUrl}/api/pages/${pageId}`;
      console.error(url);
      const response = await axios.get(url, {
        headers: {
          "Cache-Control": "no-cache",
          Accept: "*/*",
          "User-Agent": "Bookstack MCP",
          Connection: "keep-alive",
          Authorization: `Token ${process.env.BOOKSTACK_API_TOKEN}:${process.env.BOOKSTACK_API_KEY}`
        }
      });
      const bookstackPageData = bookstackPageDataSchema.parse(response.data);
      return bookstackPageData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch bookstack pages: ${error.message}`
        );
      }
      throw error;
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_pages",
          description: "Search pages from Bookstack",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to search for pages",
                default: ""
              },
              page: {
                type: "number",
                description: "Page number to return",
                minimum: 1,
                default: 1
              },
              count: {
                type: "number",
                description: "Number of pages to return (max 30)",
                minimum: 1,
                maximum: 30,
                default: 10
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      if (request.params.name !== "search_pages") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = z
        .object({
          query: z.string().optional(),
          page: z.number().optional(),
          count: z.number().optional()
        })
        .parse(request.params.arguments);

      const query = args.query || "";
      const page = Math.min(args.page || 1, 10);
      const count = Math.min(args.count || 10, 30);

      try {
        const pages = await this.fetchBookstackPages(query, page, count);
        // Promise.all로 모든 비동기 작업이 완료될 때까지 기다림
        const pageContents = await Promise.all(
          pages.data.map(async page => {
            const pageData = await this.readBookstackPage(page.id);
            const content = this.htmlToPlainText(pageData.html);

            return {
              id: page.id,
              title: page.name,
              url: page.url,
              content: content
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: pageContents
                .map(
                  page =>
                    `# ${page.title}\n\n${page.content}\n\nSource: ${page.url}`
                )
                .join("\n\n---\n\n")
            }
          ]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch pages: ${error}`
        );
      }
    });
  }

  private htmlToPlainText(html: string): string {
    // HTML 엔티티 디코딩
    let text = html
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    // 줄바꿈 태그 처리
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<\/li>/gi, "\n");

    // 목록 항목에 기호 추가
    text = text.replace(/<li[^>]*>/gi, "• ");

    // 나머지 HTML 태그 제거
    text = text.replace(/<[^>]*>/g, "");

    // 연속된 줄바꿈 및 공백 정리
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.replace(/[ \t]+/g, " ");

    return text.trim();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Bookstack MCP server running on stdio");
  }
}

const server = new BookstackServer();
server.run().catch(console.error);
