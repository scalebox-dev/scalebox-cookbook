// 基于 HTTP 的 Scalebox MCP 客户端
interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export class HttpMCPClient {
  private url: string;
  private apiKey: string;
  private sessionId?: string;
  private requestId = 0;

  constructor(url: string, apiKey: string) {
    this.url = url;
    this.apiKey = apiKey;
  }

  /**
   * 初始化连接
   */
  async initialize(): Promise<void> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'grade-analysis-agent',
          version: '1.0.0',
        },
      },
    };

    const response = await this.sendRequest(request);
    
    if (response.error) {
      throw new Error(`初始化失败: ${response.error.message}`);
    }

    console.log('✅ MCP 客户端初始化成功');
  }

  /**
   * 列出可用工具
   */
  async listTools(): Promise<Tool[]> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'tools/list',
    };

    const response = await this.sendRequest(request);
    
    if (response.error) {
      throw new Error(`列出工具失败: ${response.error.message}`);
    }

    return (response.result as { tools: Tool[] })?.tools || [];
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    const response = await this.sendRequest(request);
    
    if (response.error) {
      throw new Error(`工具调用失败: ${response.error.message}`);
    }

    // 检查是否有错误
    if (response.result?.isError) {
      const errorMsg = response.result?.content?.[0]?.text || '工具执行失败';
      throw new Error(errorMsg);
    }

    // 解析结果内容
    if (response.result?.content && Array.isArray(response.result.content) && response.result.content.length > 0) {
      const content = response.result.content[0];
      
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
    return JSON.stringify(response.result, null, 2);
  }

  /**
   * 发送请求
   */
  private async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'X-API-KEY': this.apiKey,
    };

    // 如果有 session ID，添加到 headers
    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }

    // 保存 session ID
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId && !this.sessionId) {
      this.sessionId = newSessionId;
      console.log('Session ID:', this.sessionId);
    }

    // 解析 SSE 响应
    const text = await response.text();
    return this.parseSSEResponse(text);
  }

  /**
   * 解析 SSE 响应
   */
  private parseSSEResponse(text: string): MCPResponse {
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        try {
          return JSON.parse(data) as MCPResponse;
        } catch {
          console.error('解析 SSE 响应失败:', data);
          throw new Error('无效的响应格式');
        }
      }
    }
    
    throw new Error('未找到有效的响应数据');
  }
}

// ========== 客户端实例管理 ==========

let httpClient: HttpMCPClient | null = null;

/**
 * 获取或创建 HTTP MCP 客户端
 */
export async function getHttpMCPClient(): Promise<HttpMCPClient> {
  if (httpClient) {
    return httpClient;
  }

  try {
    console.log('=== 创建 HTTP MCP 客户端 ===');
    
    const mcpUrl = process.env.MCP_SERVER_URL || 'https://mcp.scalebox.dev/mcp';
    const apiKey = process.env.SBX_API_KEY;
    
    if (!apiKey) {
      throw new Error('环境变量 SBX_API_KEY 未设置，请在 .env.local 文件中配置');
    }
    
    console.log('MCP 服务器 URL:', mcpUrl);
    console.log('API Key:', apiKey.substring(0, 10) + '...');
    
    httpClient = new HttpMCPClient(mcpUrl, apiKey);
    await httpClient.initialize();
    
    return httpClient;
  } catch (error) {
    console.error('=== HTTP MCP 客户端创建失败 ===');
    console.error('错误:', error);
    throw error;
  }
}

/**
 * 调用 MCP 工具
 */
export async function callHttpMCPTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  try {
    console.log(`=== 调用 MCP 工具: ${toolName} ===`);
    console.log('参数:', JSON.stringify(args, null, 2));
    
    const client = await getHttpMCPClient();
    const result = await client.callTool(toolName, args);
    
    console.log(`工具 ${toolName} 执行完成`);
    return result;
  } catch (error) {
    const err = error as Error;
    console.error(`=== MCP 工具调用失败: ${toolName} ===`);
    console.error('错误:', err.message);
    throw new Error(`MCP 工具 ${toolName} 失败: ${err.message}`);
  }
}

/**
 * 列出可用工具
 */
export async function listHttpMCPTools(): Promise<Tool[]> {
  const client = await getHttpMCPClient();
  return await client.listTools();
}

// 别名导出（保持兼容性）
export const getMCPClient = getHttpMCPClient;
export const callMCPTool = callHttpMCPTool;
export const listMCPTools = listHttpMCPTools;
