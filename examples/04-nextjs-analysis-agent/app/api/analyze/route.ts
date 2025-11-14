// API 路由：班级成绩分析 Agent
import { NextRequest, NextResponse } from 'next/server';
import { 
  BedrockRuntimeClient, 
  ConverseStreamCommand,
  ContentBlock,
  Message,
  Tool,
  ToolUseBlock
} from '@aws-sdk/client-bedrock-runtime';
import { callMCPTool } from '@/app/lib/mcp-client';

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的数据分析助手。用户会上传 CSV 数据文件，你需要使用 Python 和 pandas 进行数据分析。

**重要规则：**
1. 执行工具时保持简洁，只说"正在执行..."
2. 工具执行完成后，最后输出一段专业的分析总结（200-300字）
3. 分析总结要包含：关键发现、数据洞察、建议

**操作步骤：**

**步骤 1:** 使用 write_file 工具将 CSV 数据保存到 /tmp/data.csv

**步骤 2:** 使用 run_code 工具执行 Python 分析脚本，生成以下 3 张固定名称的图表：
   - /tmp/chart_1.png (第一张分析图)
   - /tmp/chart_2.png (第二张分析图)
   - /tmp/chart_3.png (第三张分析图)

**Python 代码参考模板（可根据实际数据灵活调整）：**

\`\`\`python
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 读取数据
df = pd.read_csv('/tmp/data.csv')
print(f"数据加载: {len(df)} 行 x {len(df.columns)} 列")

# 根据实际数据生成 3 张图表
# 图表 1
plt.figure(figsize=(10, 6))
# ... 你的绘图代码 ...
plt.savefig('/tmp/chart_1.png', dpi=100, bbox_inches='tight')
plt.close()
print(f"✓ 图表1: /tmp/chart_1.png ({os.path.getsize('/tmp/chart_1.png')} bytes)")

# 图表 2
plt.figure(figsize=(10, 6))
# ... 你的绘图代码 ...
plt.savefig('/tmp/chart_2.png', dpi=100, bbox_inches='tight')
plt.close()
print(f"✓ 图表2: /tmp/chart_2.png ({os.path.getsize('/tmp/chart_2.png')} bytes)")

# 图表 3
plt.figure(figsize=(10, 6))
# ... 你的绘图代码 ...
plt.savefig('/tmp/chart_3.png', dpi=100, bbox_inches='tight')
plt.close()
print(f"✓ 图表3: /tmp/chart_3.png ({os.path.getsize('/tmp/chart_3.png')} bytes)")

\`\`\`

**步骤 3:** 输出你的专业分析总结（200-300字），包含：
- 关键数据发现
- 数据洞察
- 改进建议

**注意：总结要是独立的分析报告，不要重复工具调用过程！**
`;

const DEFAULT_USER_PROMPT = `请分析这份班级成绩表，我需要知道：
1. 班级的平均分
2. 各科目的平均分
3. 各科目的第一名是谁
4. 总分第一名是谁
5. 生成相关的数据分析图表（如各科平均分对比图、成绩分布图等）

请给出详细的分析报告。`;

export async function POST(req: NextRequest) {
  try {
    console.log('\n=== API 请求开始 ===');
    const body = await req.json();
    const { csvContent, systemPrompt, userPrompt } = body;

    if (!csvContent) {
      return NextResponse.json({ error: '缺少 CSV 数据' }, { status: 400 });
    }

    // 配置
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // 按优先级尝试模型（Nova 最稳定）
    const defaultModelId = region.startsWith('us-') 
      ? 'us.amazon.nova-lite-v1:0'    // 美国区域
      : 'amazon.nova-lite-v1:0';       // 其他区域
    
    const modelId = process.env.BEDROCK_MODEL_ID || defaultModelId;
    
    console.log('Region:', region);
    console.log('Model ID:', modelId);
    console.log('CSV 行数:', csvContent.split('\n').length);

    // 创建 Bedrock 客户端
    const client = new BedrockRuntimeClient({ region });

    // 准备提示词
    const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const finalUserPrompt = `${userPrompt || DEFAULT_USER_PROMPT}\n\nCSV 数据内容：\n\`\`\`csv\n${csvContent}\n\`\`\``;

    // 定义 Bedrock 工具规格
    const toolConfig: { tools: Tool[] } = {
      tools: [
        {
          toolSpec: {
            name: 'write_file',
            description: '将内容写入沙箱文件系统',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: '文件路径，如 /tmp/grades.csv' },
                  content: { type: 'string', description: '文件内容' },
                },
                required: ['path', 'content'],
              },
            },
          },
        },
        {
          toolSpec: {
            name: 'install_packages',
            description: '在沙箱中安装 Python 包',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  packages: { type: 'string', description: '包名，空格分隔，如 pandas numpy matplotlib' },
                },
                required: ['packages'],
              },
            },
          },
        },
        {
          toolSpec: {
            name: 'run_code',
            description: '在沙箱中执行 Python 代码进行数据分析',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Python 代码' },
                },
                required: ['code'],
              },
            },
          },
        },
        {
          toolSpec: {
            name: 'read_file',
            description: '从沙箱读取文件内容',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: '文件路径' },
                },
                required: ['path'],
              },
            },
          },
        },
      ],
    };

    // 工具执行函数映射
    const toolExecutors: Record<string, (input: any) => Promise<string>> = {
      write_file: async (input: any) => {
        console.log(`\n🔧 EXECUTOR: write_file`);
        console.log('接收参数类型:', typeof input);
        console.log('接收参数:', JSON.stringify(input).substring(0, 200));
        
        // 如果 input 是字符串，解析它
        let params = input;
        if (typeof input === 'string') {
          console.log('⚠️ 参数是字符串，解析 JSON');
          try {
            params = JSON.parse(input);
          } catch (e) {
            throw new Error(`无法解析参数 JSON: ${input.substring(0, 100)}`);
          }
        }
        
        const path = params?.path || params?.file_path;
        const content = params?.content || params?.file_content || params?.data;
        
        console.log('提取的 path:', path);
        console.log('提取的 content 长度:', content?.length || 0);
        
        if (!path) {
          throw new Error(`write_file 缺少 path 参数。接收到的参数: ${JSON.stringify(input).substring(0, 200)}`);
        }
        if (content === undefined || content === null) {
          throw new Error(`write_file 缺少 content 参数。接收到的参数: ${JSON.stringify(input).substring(0, 200)}`);
        }
        
        return await callMCPTool('write_file', { path, content: String(content) });
      },
      
      install_packages: async (input: any) => {
        console.log(`\n🔧 EXECUTOR: install_packages`);
        console.log('接收参数类型:', typeof input);
        
        // 解析字符串参数
        let params = input;
        if (typeof input === 'string') {
          console.log('⚠️ 参数是字符串，解析 JSON');
          try {
            params = JSON.parse(input);
          } catch (e) {
            throw new Error(`无法解析参数 JSON: ${input.substring(0, 100)}`);
          }
        }
        
        const packages = params?.packages || params?.package || params?.deps;
        console.log('提取的 packages:', packages);
        
        if (!packages) {
          throw new Error(`install_packages 缺少 packages 参数。接收到的参数: ${JSON.stringify(input).substring(0, 200)}`);
        }
        
        return await callMCPTool('install_packages', { packages: String(packages) });
      },
      
      run_code: async (input: any) => {
        console.log(`\n🔧 EXECUTOR: run_code`);
        console.log('接收参数类型:', typeof input);
        
        // 解析字符串参数
        let params = input;
        if (typeof input === 'string') {
          console.log('⚠️ 参数是字符串，解析 JSON');
          try {
            params = JSON.parse(input);
          } catch (e) {
            throw new Error(`无法解析参数 JSON: ${input.substring(0, 100)}`);
          }
        }
        
        const code = params?.code || params?.script || params?.python_code;
        console.log('提取的 code 长度:', code?.length || 0);
        console.log('code 前100字符:', code?.substring(0, 100));
        
        if (!code) {
          throw new Error(`run_code 缺少 code 参数。接收到的参数: ${JSON.stringify(input).substring(0, 200)}`);
        }
        
        return await callMCPTool('run_code', { code: String(code), language: 'python' });
      },
      
      read_file: async (input: any) => {
        console.log(`\n🔧 EXECUTOR: read_file`);
        console.log('接收参数类型:', typeof input);
        
        // 解析字符串参数
        let params = input;
        if (typeof input === 'string') {
          console.log('⚠️ 参数是字符串，解析 JSON');
          try {
            params = JSON.parse(input);
          } catch (e) {
            throw new Error(`无法解析参数 JSON: ${input.substring(0, 100)}`);
          }
        }
        
        const path = params?.path || params?.file_path || params?.filename;
        console.log('提取的 path:', path);
        
        if (!path) {
          throw new Error(`read_file 缺少 path 参数。接收到的参数: ${JSON.stringify(input).substring(0, 200)}`);
        }
        
        return await callMCPTool('read_file', { path: String(path) });
      },
    };

    console.log('\n=== 开始 Agentic Loop ===');

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 对话历史
          const conversationMessages: Message[] = [
            {
              role: 'user',
              content: [{ text: finalUserPrompt }],
            },
          ];

          let step = 0;
          const maxSteps = 15;

          // Agentic Loop: 持续对话直到 LLM 停止请求工具
          while (step < maxSteps) {
            step++;
            console.log(`\n--- Step ${step} ---`);

            // 调用 Bedrock
            const command = new ConverseStreamCommand({
              modelId,
              messages: conversationMessages,
              system: [{ text: finalSystemPrompt }],
              toolConfig,
              inferenceConfig: {
                temperature: 0.7,
                maxTokens: 4096,
              },
            });

            const response = await client.send(command);
            if (!response.stream) break;

            // 收集响应内容
            const contentBlocks: ContentBlock[] = [];
            let currentText = '';
            let currentToolUse: ToolUseBlock | null = null;
            let stopReason = '';

            // 处理流式事件
            for await (const event of response.stream) {
              // 文本增量
              if (event.contentBlockDelta?.delta?.text) {
                const text = event.contentBlockDelta.delta.text;
                currentText += text;
                // 流式发送给前端
                controller.enqueue(encoder.encode(text));
              }

              // 工具调用开始
              if (event.contentBlockStart?.start?.toolUse) {
                const toolUse = event.contentBlockStart.start.toolUse;
                console.log('🔧 工具调用开始:', toolUse.name);
                currentToolUse = {
                  toolUseId: toolUse.toolUseId || '',
                  name: toolUse.name || '',
                  input: {},
                };
              }

              // 工具输入增量（关键：需要正确合并）
              if (event.contentBlockDelta?.delta?.toolUse && currentToolUse) {
                const inputChunk = event.contentBlockDelta.delta.toolUse.input;
                if (inputChunk) {
                  console.log('输入增量类型:', typeof inputChunk);
                  console.log('输入增量内容:', JSON.stringify(inputChunk).substring(0, 100));
                  
                  // 如果当前 input 是字符串，需要拼接字符串
                  if (typeof currentToolUse.input === 'string' && typeof inputChunk === 'string') {
                    currentToolUse.input += inputChunk;
                  } 
                  // 如果增量是字符串但当前是对象（初始化为 {}），替换为字符串
                  else if (typeof inputChunk === 'string' && Object.keys(currentToolUse.input).length === 0) {
                    currentToolUse.input = inputChunk;
                  }
                  // 否则合并对象
                  else if (typeof inputChunk === 'object') {
                    currentToolUse.input = { ...currentToolUse.input, ...inputChunk };
                  }
                  
                  console.log('当前累积 input 长度:', typeof currentToolUse.input === 'string' 
                    ? currentToolUse.input.length 
                    : JSON.stringify(currentToolUse.input).length);
                }
              }

              // 内容块结束
              if (event.contentBlockStop) {
                if (currentText) {
                  contentBlocks.push({ text: currentText });
                  currentText = '';
                }
                if (currentToolUse) {
                  console.log('工具调用原始 input:', currentToolUse.input);
                  console.log('input 类型:', typeof currentToolUse.input);
                  
                  // 关键修复：如果 input 是字符串，需要解析成对象
                  let parsedInput = currentToolUse.input;
                  if (typeof currentToolUse.input === 'string') {
                    console.log('⚠️ input 是字符串，尝试解析 JSON');
                    try {
                      parsedInput = JSON.parse(currentToolUse.input);
                      console.log('✅ JSON 解析成功:', parsedInput);
                    } catch (e) {
                      console.error('❌ JSON 解析失败:', e);
                    }
                  }
                  
                  const toolUseBlock: ToolUseBlock = {
                    toolUseId: currentToolUse.toolUseId,
                    name: currentToolUse.name,
                    input: parsedInput,
                  };
                  
                  console.log('工具调用完整参数:', JSON.stringify(parsedInput, null, 2));
                  contentBlocks.push({ toolUse: toolUseBlock });
                  const toolInfo = `\n\n🔧 调用工具: ${currentToolUse.name}\n`;
                  controller.enqueue(encoder.encode(toolInfo));
                  currentToolUse = null;
                }
              }

              // 消息停止
              if (event.messageStop) {
                stopReason = event.messageStop.stopReason || '';
                console.log('消息停止，原因:', stopReason);
              }
            }

            // 将 AI 响应添加到对话历史
            conversationMessages.push({
              role: 'assistant',
              content: contentBlocks,
            });

            // 如果没有工具调用，对话结束
            if (stopReason !== 'tool_use') {
              console.log('对话结束，原因:', stopReason);
              break;
            }

            // 执行工具调用
            const toolResults: ContentBlock[] = [];
            let hasToolCalls = false;
            
            for (const block of contentBlocks) {
              if (block.toolUse) {
                hasToolCalls = true;
                const { toolUseId, name, input } = block.toolUse;
                console.log(`\n${'='.repeat(60)}`);
                console.log(`📦 准备执行工具: ${name}`);
                console.log('Tool Use ID:', toolUseId);
                console.log('输入参数类型:', typeof input);
                console.log('输入参数 keys:', Object.keys(input || {}));
                console.log('输入参数完整内容:', JSON.stringify(input, null, 2));
                console.log('='.repeat(60));

                try {
                  const executor = toolExecutors[name];
                  if (!executor) {
                    throw new Error(`未知工具: ${name}`);
                  }

                  // 验证参数
                  if (!input || typeof input !== 'object') {
                    throw new Error('工具输入参数格式错误: input 不是对象');
                  }

                  // 检查是否为空对象
                  if (Object.keys(input).length === 0) {
                    throw new Error(`工具 ${name} 的参数为空对象`);
                  }

                  const result = await executor(input);
                  console.log('✅ 工具执行成功');
                  console.log('结果长度:', result.length);
                  console.log('结果预览:', result.substring(0, 200));

                  // 构建符合 Bedrock 格式的工具结果
                  toolResults.push({
                    toolResult: {
                      toolUseId: toolUseId,
                      content: [{ text: result }],
                      status: 'success',
                    },
                  });

                  controller.enqueue(encoder.encode(`✅ 完成\n`));
                  
                } catch (error: any) {
                  console.error('❌ 工具执行失败:', error.message);
                  console.error('错误堆栈:', error.stack);
                  
                  const errorMsg = `工具执行失败: ${error.message}`;
                  
                  // 即使失败也要返回结果给 LLM
                  toolResults.push({
                    toolResult: {
                      toolUseId: toolUseId,
                      content: [{ text: errorMsg }],
                      status: 'error',
                    },
                  });
                  
                  controller.enqueue(encoder.encode(`❌ 失败: ${error.message}\n`));
                }
              }
            }

            // 检查是否有工具调用
            if (!hasToolCalls) {
              console.log('本轮没有工具调用');
              break;
            }

            // 验证并添加工具结果到对话历史
            if (toolResults.length > 0) {
              console.log(`\n📤 返回 ${toolResults.length} 个工具结果给 LLM`);
              console.log('工具结果格式:', JSON.stringify(toolResults, null, 2).substring(0, 300));
              
              conversationMessages.push({
                role: 'user',
                content: toolResults,
              });
            } else {
              console.error('⚠️ 有工具调用但没有结果，中断循环');
              break;
            }
          }

          console.log('\n✅ Agentic Loop 完成');
          
          // 等待文件写入完成
          await new Promise(resolve => setTimeout(resolve, 800));
          
          console.log('\n' + '='.repeat(60));
          console.log('📦 从沙盒复制图表文件');
          console.log('='.repeat(60));
          
          const charts: any[] = [];
          
          // 读取 3 张固定名称的图表
          const chartPaths = [
            { path: '/tmp/chart_1.png', name: 'chart_1', title: '分析图表 1' },
            { path: '/tmp/chart_2.png', name: 'chart_2', title: '分析图表 2' },
            { path: '/tmp/chart_3.png', name: 'chart_3', title: '分析图表 3' },
          ];
          
          for (const config of chartPaths) {
            try {
              console.log(`读取: ${config.path}`);
              const fileContent = await callMCPTool('read_file', { path: config.path });
              
              // 提取 base64 数据
              let base64Data = fileContent;
              if (fileContent.startsWith('{')) {
                try {
                  const parsed = JSON.parse(fileContent);
                  base64Data = parsed.content || parsed.data || parsed.text || fileContent;
                } catch {}
              }
              
              if (base64Data && base64Data.length > 1000) {
                charts.push({
                  name: config.name,
                  title: config.title,
                  data: base64Data,
                });
                console.log(`✅ ${config.name}: ${base64Data.length} 字符`);
              } else {
                console.log(`⚠️ ${config.name}: 数据为空或太小`);
              }
            } catch (error: any) {
              console.log(`⚠️ ${config.path}: ${error.message}`);
            }
          }
          
          console.log('='.repeat(60));
          console.log(`📊 成功读取图表: ${charts.length} 张`);
          console.log('='.repeat(60));
          
          // 分批发送数据，避免单个包过大导致 HTTP2 错误
          // 使用更小的块大小（20KB）以确保稳定性
          const CHUNK_SIZE = 20000;
          
          // 辅助函数：分块发送大字符串
          async function sendInChunks(
            data: string, 
            markerPrefix: string, 
            name: string
          ) {
            let offset = 0;
            let chunkIndex = 0;
            
            while (offset < data.length) {
              const chunk = data.substring(offset, offset + CHUNK_SIZE);
              const isLast = (offset + CHUNK_SIZE) >= data.length;
              const message = `\n__${markerPrefix}_CHUNK__${JSON.stringify({ 
                chunk, 
                index: chunkIndex, 
                last: isLast,
                name 
              })}__END_${markerPrefix}_CHUNK__\n`;
              
              controller.enqueue(encoder.encode(message));
              offset += CHUNK_SIZE;
              chunkIndex++;
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            console.log(`✅ 已发送 ${name}（${chunkIndex} 块）`);
          }
          
          // 发送图表（每个图表分块发送）
          if (charts.length > 0) {
            for (const chart of charts) {
              console.log(`发送图表: ${chart.name} (${chart.data.length} 字符)`);
              await sendInChunks(chart.data, 'CHART', chart.name);
            }
          } else {
            console.log('⚠️ 没有图表可发送');
          }
          
          // 发送完成标记
          controller.enqueue(encoder.encode('\n__TRANSFER_COMPLETE__\n'));
          console.log('✅ 图表传输完成');
          
          controller.close();
        } catch (error: any) {
          console.error('流式处理错误:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('=== 错误 ===');
    console.error('消息:', error.message);
    console.error('堆栈:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || '分析失败',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
