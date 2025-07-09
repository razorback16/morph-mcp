# MCP Edit Service

A Model Context Protocol (MCP) server that provides file editing capabilities using Morph's fast apply API.

## Features

- Edit files using natural language instructions
- Powered by Morph's `morph-v3-large` model
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

4. Build the project:
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
        "MORPH_BASE_URL": "https://your-custom-api.com/v1"
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
```

## 部署和使用步骤

1. **安装和构建**:
```bash
cd mcp-edit-service
npm install
npm run build
```

2. **设置环境变量**:
```bash
export MORPH_API_KEY=your_actual_api_key
export MORPH_BASE_URL=https://your-custom-api.com/v1  # Optional
```

3. **在 Claude Desktop 中配置**:
编辑 `~/.config/claude-desktop/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "edit-service": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-edit-service/dist/index.js"],
      "env": {
        "MORPH_API_KEY": "your_actual_api_key",
        "MORPH_BASE_URL": "https://your-custom-api.com/v1"
      }
    }
  }
}
```

4. **重启 Claude Desktop** 以加载新的 MCP 服务

5. **使用示例**:
在支持 MCP 的 AI IDE 中，你现在可以使用 `edit_file` 工具来编辑文件，例如：
```
请使用 edit_file 工具在 src/main.js 中添加错误处理