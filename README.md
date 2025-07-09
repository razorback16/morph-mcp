# MCP Edit Service

A Model Context Protocol (MCP) server that provides file editing capabilities using Morph's fast apply API.

## Features

- Edit files using natural language instructions
- Powered by Morph's LLM (configurable model)
- Automatic backup creation before edits
- Graceful error handling for file I/O and API errors
- MCP-compatible for use with AI IDEs

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your Morph API key:
```bash
export MORPH_API_KEY=your_api_key_here
```

3. (Optional) Set custom API base URL:
```bash
export MORPH_BASE_URL=https://your-custom-api.com/v1
```
If not set, defaults to `https://api.morphllm.com/v1`

4. (Optional) Set custom model:
```bash
export MORPH_MODEL=your-preferred-model
```
If not set, defaults to `morph/morph-v3-large`

5. Build the project:
```bash
npm run build
```

## Usage in MCP-compatible AI IDEs

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "edit-service": {
      "command": "node",
      "args": ["/path/to/mcp-edit-service/dist/index.js"],
      "env": {
        "MORPH_API_KEY": "your_api_key_here",
        "MORPH_BASE_URL": "https://your-custom-api.com/v1",
        "MORPH_MODEL": "your-preferred-model"
      }
    }
  }
}
```

### Cursor or other MCP-compatible IDEs

Configure the MCP server with:
- Command: `node /path/to/mcp-edit-service/dist/index.js`
- Environment: 
  - `MORPH_API_KEY=your_api_key_here`
  - `MORPH_BASE_URL=https://your-custom-api.com/v1` (optional)
  - `MORPH_MODEL=your-preferred-model` (optional)

## Available Tools

### edit_file

Edits an existing file using Morph's fast apply API.

**Parameters:**
- `target_file` (string, required): Path to the file to edit
- `instructions` (string, required): Single sentence describing the edit
- `code_edit` (string, required): Only the lines to change with `// ... existing code ...` comments for unchanged sections

**Example:**
```json
{
  "target_file": "src/main.js",
  "instructions": "Add error handling to the fetch function",
  "code_edit": "try {\n  const response = await fetch(url);\n  // ... existing code ...\n} catch (error) {\n  console.error('Fetch failed:', error);\n  throw error;\n}"
}
```

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Start production server
npm start
```

## Error Handling

The service provides comprehensive error handling for:
- Missing or invalid API keys
- File access permissions
- Network errors with Morph API
- Invalid tool arguments
- File I/O operations

All errors are returned in a structured JSON format with descriptive messages.