#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Validation schemas
const EditFileSchema = z.object({
  target_file: z.string().describe('The target file to modify. Always specify the target file as the first argument and use the relative path in the workspace of the file to edit'),
  instructions: z.string().describe('Single sentence describing the edit in first person'),
  code_edit: z.string().describe('Specify ONLY the precise lines of code that you wish to edit. NEVER specify or write out unchanged code. Instead, represent all unchanged code using the comment of the language you\'re editing in - example: // ... existing code ...')
});

class EditFileServer {
  private server: Server;
  private morphClient: OpenAI;
  private model: string;

  constructor() {
    // Initialize Morph client
    const apiKey = process.env.MORPH_API_KEY;
    if (!apiKey) {
      throw new Error('MORPH_API_KEY environment variable is required');
    }

    const baseURL = process.env.MORPH_BASE_URL || 'https://api.morphllm.com/v1';
    this.model = process.env.MORPH_MODEL || 'morph/morph-v3-large';

    this.morphClient = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL
    });

    this.server = new Server(
      {
        name: 'mcp-edit-service',
        version: '1.0.0',
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'edit_file',
            description: 'Use this tool to propose an edit to an existing file.\n\nThis will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.\nWhen writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.\n\nYou should bias towards repeating as few lines of the original file as possible to convey the change.\nNEVER show unmodified code in the edit, unless sufficient context of unchanged lines around the code you\'re editing is needed to resolve ambiguity.\nIf you plan on deleting a section, you must provide surrounding context to indicate the deletion.\nDO NOT omit spans of pre-existing code without using the // ... existing code ... comment to indicate its absence.\n\nYou should specify the following arguments before the others: [target_file]',
            inputSchema: {
              type: 'object',
              properties: {
                target_file: {
                  type: 'string',
                  description: 'The target file to modify. Always specify the target file as the first argument and use the relative path in the workspace of the file to edit'
                },
                instructions: {
                  type: 'string',
                  description: 'Single sentence describing the edit in first person'
                },
                code_edit: {
                  type: 'string',
                  description: 'Specify ONLY the precise lines of code that you wish to edit. NEVER specify or write out unchanged code. Instead, represent all unchanged code using the comment of the language you\'re editing in - example: // ... existing code ...'
                }
              },
              required: ['target_file', 'instructions', 'code_edit']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'edit_file') {
        return await this.handleEditFile(request.params.arguments);
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });
  }

  private async handleEditFile(args: any) {
    try {
      // Validate arguments
      const { target_file, instructions, code_edit } = EditFileSchema.parse(args);

      // Resolve the target file path
      const filePath = path.resolve(target_file);

      // Check if file exists and is accessible
      try {
        await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `File not found or not accessible: ${target_file}`
              })
            }
          ]
        };
      }

      // Read the current file content
      const originalCode = await fs.readFile(filePath, 'utf-8');

      // Use Morph's fast apply API to generate the updated code
      const response = await this.morphClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: `<code>${originalCode}</code>\n<update>${code_edit}</update>`
          }
        ],
        stream: false
      });

      const updatedCode = response.choices[0]?.message?.content;

      if (!updatedCode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to generate updated code from Morph API'
              })
            }
          ]
        };
      }

      // Create backup of original file
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, originalCode, 'utf-8');

      // Write the updated content back to the file
      await fs.writeFile(filePath, updatedCode, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully applied edit to ${target_file}: ${instructions}`,
              changes_applied: code_edit,
              backup_created: backupPath
            })
          }
        ]
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Invalid arguments: ${error.errors.map(e => e.message).join(', ')}`
              })
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Cleanup function
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}

// Start the server
const server = new EditFileServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
