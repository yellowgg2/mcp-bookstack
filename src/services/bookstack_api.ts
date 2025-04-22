import axios, { AxiosError } from "axios";
import { z } from 'zod';
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
    BookstackSearchResponse, bookstackSearchResponseSchema,
    BookstackPageData, bookstackPageDataSchema,
    BookDetails, bookDetailsSchema,
    CreateBookApiPayload, CreatePageApiPayload, UpdatePageApiPayload, PageDetails
} from "../common/schemas_api.js";

export class BookStackAPI {
    private baseUrl: string;
    private token: string;
    private secret: string;
    private userAgent: string;

    constructor(baseUrl: string, token: string, secret: string, serverVersion: string = '1.2.0') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Ensure no trailing slash
        this.token = token;
        this.secret = secret;
        this.userAgent = `Bookstack MCP Server v${serverVersion}`;
    }

    private getHeaders(isJsonPayload: boolean = false): Record<string, string> {
        const headers: Record<string, string> = {
            "Cache-Control": "no-cache",
            Accept: "application/json",
            "User-Agent": this.userAgent,
            Connection: "keep-alive",
            Authorization: `Token ${this.token}:${this.secret}`
        };
        if (isJsonPayload) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }

    private handleError(error: unknown, action: string): McpError {
        // Implementiere hier die handleApiError Logik aus der vorherigen app.ts
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const responseData = error.response?.data;
            let message = `Failed to ${action}: ${error.message}`;
            if (status) { message += ` (Status: ${status})`; }
            if (responseData && typeof responseData === 'object') {
                const apiError = (responseData as any)?.error?.message || JSON.stringify(responseData);
                message += ` - API Error: ${apiError}`;
            }
            console.error(`[BookStackAPI Error] ${message}`, 'Request URL:', error.config?.url);
            if (status === 401 || status === 403) return new McpError(ErrorCode.InvalidParams, message);
            if (status === 404) return new McpError(ErrorCode.MethodNotFound, message);
            return new McpError(ErrorCode.InternalError, message);
        } else if (error instanceof z.ZodError) {
             const message = `Failed to parse API response for ${action}. Details: ${JSON.stringify(error.errors)}`;
             console.error(`[BookStackAPI Error] ${message}`);
             return new McpError(ErrorCode.InternalError, message);
        } else {
           const message = `An unexpected error occurred during ${action}: ${error}`;
           console.error(`[BookStackAPI Error] ${message}`);
           return new McpError(ErrorCode.InternalError, message);
        }
    }

    async searchPages(query: string, page: number, count: number): Promise<BookstackSearchResponse> {
        const action = `search pages with query "${query}"`;
        try {
            const searchQuery = query ? `${query}{type:page}` : '{type:page}';
            const url = `${this.baseUrl}/api/search?query=${encodeURIComponent(searchQuery)}&page=${page}&count=${count}`;
            console.error(`[BookStackAPI] GET ${url}`);
            const response = await axios.get(url, { headers: this.getHeaders() });
            return bookstackSearchResponseSchema.parse(response.data);
        } catch (error) {
            throw this.handleError(error, action);
        }
    }

    async getPage(pageId: number): Promise<BookstackPageData> {
        const action = `read page ${pageId}`;
        try {
            const url = `${this.baseUrl}/api/pages/${pageId}`;
            console.error(`[BookStackAPI] GET ${url}`);
            const response = await axios.get(url, { headers: this.getHeaders() });
            return bookstackPageDataSchema.parse(response.data);
        } catch (error) {
            throw this.handleError(error, action);
        }
    }

    async createBook(payload: CreateBookApiPayload): Promise<BookDetails> {
         const action = `create book "${payload.name}"`;
        try {
            const url = `${this.baseUrl}/api/books`;
            console.error(`[BookStackAPI] POST ${url}`, payload);
            const response = await axios.post(url, payload, { headers: this.getHeaders(true) });
            return bookDetailsSchema.parse(response.data);
        } catch (error) {
            throw this.handleError(error, action);
        }
    }

    async createPage(payload: CreatePageApiPayload): Promise<PageDetails> {
        const action = `create page "${payload.name}" in book ${payload.book_id}`;
        try {
            const url = `${this.baseUrl}/api/pages`;
            console.error(`[BookStackAPI] POST ${url}`, payload);
            const response = await axios.post(url, payload, { headers: this.getHeaders(true) });
            return bookstackPageDataSchema.parse(response.data); // PageDetails ist alias für BookstackPageData
        } catch (error) {
            throw this.handleError(error, action);
        }
    }

    async updatePage(pageId: number, payload: UpdatePageApiPayload): Promise<PageDetails> {
        const action = `update page ${pageId}`;
        try {
            const url = `${this.baseUrl}/api/pages/${pageId}`;
            console.error(`[BookStackAPI] PUT ${url}`, payload);
            const response = await axios.put(url, payload, { headers: this.getHeaders(true) });
            return bookstackPageDataSchema.parse(response.data);
        } catch (error) {
            throw this.handleError(error, action);
        }
    }
}