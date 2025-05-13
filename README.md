[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/yellowgg2-mcp-bookstack-badge.png)](https://mseep.ai/app/yellowgg2-mcp-bookstack)

# BookStack MCP Server

[![smithery badge](https://smithery.ai/badge/@yellowgg2/mcp-bookstack)](https://smithery.ai/server/@yellowgg2/mcp-bookstack)

A Model Context Protocol (MCP) server that provides tools for searching pages from BookStack. This server interacts with the BookStack API and provides structured data for pages with clean HTML-to-text conversion.

## Features

- Search pages from BookStack with customizable queries
- Get structured data including titles, URLs, and content
- Configurable pagination (page number and count)
- HTML-to-text conversion for clean content reading
- Clean error handling and validation

## Installation

### Installing via Smithery

To install mcp-bookstack for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@yellowgg2/mcp-bookstack):

```bash
npx -y @smithery/cli install @yellowgg2/mcp-bookstack --client claude
```

### Installing Manually
1. Clone the repository:

```bash
git clone https://github.com/yellowgg2/mcp-bookstack.git
cd mcp-bookstack
```

2. Install dependencies:

```bash
npm install
```

3. Configure your environment:

Create a `.env` file with your BookStack API credentials or provide them in the MCP settings configuration file:

```
BOOKSTACK_API_TOKEN=your_token
BOOKSTACK_API_URL=your_bookstack_url
BOOKSTACK_API_KEY=your_api_key
```

4. Build the server:

```bash
npm run build
```

5. Add to your MCP settings configuration file (location depends on your system):

For VSCode Claude extension:

```json
{
  "mcpServers": {
    "bookstack": {
      "command": "node",
      "args": ["/path/to/mcp-bookstack/build/app.js"],
      "env": {
        "BOOKSTACK_API_URL": "your_bookstack_url",
        "BOOKSTACK_API_TOKEN": "your_token",
        "BOOKSTACK_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Usage

The server provides a tool called `search_pages` that can be used to search pages from BookStack.

### Tool: search_pages

Parameters:

- `query` (string): Query to search for pages
  - Default: "" (empty string)
- `page` (number): Page number to return
  - Range: 1-10
  - Default: 1
- `count` (number): Number of pages to return
  - Range: 1-30
  - Default: 10

Example usage:

```typescript
use_mcp_tool with:
server_name: "bookstack"
tool_name: "search_pages"
arguments: {
  "query": "knowledge base",
  "page": 1,
  "count": 5
}
```

Sample output:

```
# Page Title

Page content in plain text format...

Source: https://your-bookstack-url/page-url
```

## Integrating with Claude

To use this MCP server with Claude, you'll need to:

1. Have the Claude desktop app or VSCode Claude extension installed
2. Configure the MCP server in your settings
3. Use Claude's natural language interface to interact with BookStack

### Configuration

For the Claude desktop app, VSCode Claude extension, and Cursor, add the server configuration to:

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "bookstack": {
      "command": "node",
      "args": ["/path/to/mcp-bookstack/build/app.js"],
      "env": {
        "BOOKSTACK_API_URL": "your_bookstack_url",
        "BOOKSTACK_API_TOKEN": "your_token",
        "BOOKSTACK_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Example Interactions

Once configured, you can interact with Claude using natural language to search BookStack pages. Examples:

- "Search for documentation about API usage in our BookStack knowledge base"
- "Find information about deployment in our internal docs"
- "Look up security guidelines in BookStack"

Claude will automatically use the appropriate parameters to search for the pages you want.

## Page Response Structure

Each page response includes:

- Title of the page
- Full content of the page (converted from HTML to plain text)
- Source URL to the original page

The HTML-to-text conversion handles:

- HTML entity decoding
- Line breaks and paragraph formatting
- List items with bullet points
- Removal of HTML tags
- Whitespace normalization

## Development

The server is built using:

- TypeScript
- Model Context Protocol SDK
- Axios for API requests
- Zod for data validation
- dotenv for environment configuration

To modify the server:

1. Make changes to `src/app.ts`
2. Rebuild:

```bash
npm run build
```

## Error Handling

The server includes robust error handling for:

- API connection failures
- Authentication issues
- Invalid parameter values
- Data parsing errors

Errors are returned with appropriate error codes and descriptive messages.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your own projects.
