import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const phoenixIntrospectionTool: MultiAgentTool = {
  displayName: "Phoenix Introspection Tool",
  name: 'PHOENIX/INTROSPECT{',
  endToken: '}',

  async execute(params: Record<string, unknown>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const query = params['query'] as string;

    if (!query) {
      return { result: "Error: No query provided for introspection." };
    }

    context.sendMessage(JSON.stringify({ status: 'PROGRESS_UPDATES', completed_status_message: `Running Phoenix trace introspection query: ${query}` }));

    let transport: StdioClientTransport | null = null;
    let client: Client | null = null;

    try {
      transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@arizeai/phoenix-mcp'],
        env: process.env
      });

      client = new Client(
        {
          name: "Novum-Phoenix-Introspection",
          version: "1.0.0"
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );

      await client.connect(transport);

      const mcpTools = await client.listTools();
      let targetTool = mcpTools.tools.find(t => t.name === 'search_traces' || t.name.includes('trace'));

      if (!targetTool && mcpTools.tools.length > 0) {
        targetTool = mcpTools.tools[0];
      }

      if (!targetTool) {
         return { result: `Error: No introspection tools available from Phoenix MCP server.` };
      }

      let mcpArgs: Record<string, any> = {};
      if (targetTool.name === 'search_traces') {
         mcpArgs = { condition: query };
      } else {
         mcpArgs = { query: query };
      }

      const result = await client.callTool({
        name: targetTool.name,
        arguments: mcpArgs
      });

      if (result.isError) {
        const errorContent = result.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n');
        return { result: `Phoenix MCP Introspection Error: ${errorContent}` };
      }

      const responseText = result.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n');

      return { result: `Introspection Results:\n${responseText}` };

    } catch (e: any) {
      return { result: `Phoenix Introspection failed: ${e.message}` };
    } finally {
      if (client) {
         try { await client.close(); } catch (e) {}
      }
      if (transport) {
         try { await transport.close(); } catch (e) {}
      }
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const trimmed = invocation.trim();
    const endToken = this.endToken ?? '}';

    if (!trimmed.endsWith(endToken)) {
      return { success: false, error: `Invalid syntax: Must end with '${endToken}'` };
    }

    const content = trimmed.substring(0, trimmed.lastIndexOf(endToken)).trim();

    if (!content) {
       return { success: false, error: "No query specified." };
    }

    return { success: true, params: { query: content } };
  }
};
