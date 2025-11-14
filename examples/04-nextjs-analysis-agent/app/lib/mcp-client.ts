// MCP 客户端工具类
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

/**
 * 获取或创建 MCP 客户端
 */
export async function getMCPClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  try {
    console.log('=== 创建 MCP 客户端 ===');
    
    const pythonPath = process.env.MCP_PYTHON_PATH || '/Users/yindongliang/cloudsway/mcp-server/packages/python/venv/bin/python';
    const serverPath = process.env.MCP_SERVER_PATH || '/Users/yindongliang/cloudsway/mcp-server/packages/python/server.py';
    
    console.log('Python 路径:', pythonPath);
    console.log('Server 路径:', serverPath);
    console.log('Scalebox API Key:', process.env.SCALEBOX_API_KEY ? '已设置' : '未设置');
    
    // 创建客户端
    mcpClient = new Client(
      {
        name: 'grade-analysis-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 创建 stdio transport
    const transport = new StdioClientTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        SCALEBOX_API_KEY: process.env.SCALEBOX_API_KEY || '',
        SCALEBOX_API_URL: process.env.SCALEBOX_API_URL || 'https://api.scalebox.dev',
      },
    });

    console.log('正在连接 MCP 服务器...');
    // 连接客户端
    await mcpClient.connect(transport);
    console.log('MCP 客户端连接成功');

    return mcpClient;
  } catch (error: any) {
    console.error('=== MCP 客户端创建失败 ===');
    console.error('错误:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    throw error;
  }
}

/**
 * 调用 MCP 工具
 * @returns 总是返回字符串格式的结果
 */
export async function callMCPTool(toolName: string, args: any): Promise<string> {
  try {
    console.log(`=== 调用 MCP 工具: ${toolName} ===`);
    console.log('参数:', JSON.stringify(args, null, 2));
    
    const client = await getMCPClient();
    
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    console.log(`工具 ${toolName} 执行完成`);
    console.log('MCP 原始结果:', JSON.stringify(result, null, 2));

    // 检查是否有错误
    if (result.isError) {
      const errorMsg = result.content?.[0]?.text || '工具执行失败';
      console.error('MCP 工具返回错误:', errorMsg);
      throw new Error(errorMsg);
    }

    // 解析结果内容
    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      const content = result.content[0] as any;
      
      if (content.type === 'text' && content.text) {
        // 尝试格式化 JSON，否则返回原文本
        try {
          const parsed = JSON.parse(content.text);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return content.text;
        }
      }
    }

    // 如果没有 content，返回完整 result 的字符串形式
    console.warn('MCP 返回格式异常，返回完整结果');
    return JSON.stringify(result, null, 2);
    
  } catch (error: any) {
    console.error(`=== MCP 工具调用失败: ${toolName} ===`);
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 重新抛出，让上层处理
    throw new Error(`MCP 工具 ${toolName} 失败: ${error.message}`);
  }
}

/**
 * 列出可用工具
 */
export async function listMCPTools(): Promise<any[]> {
  const client = await getMCPClient();
  const result = await client.listTools();
  return result.tools;
}

/**
 * 关闭 MCP 客户端
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}
