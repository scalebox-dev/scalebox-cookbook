# 班级成绩分析 Agent

基于 AWS Bedrock AI + Scalebox MCP 的智能成绩分析系统。

## 功能特点

- 📊 **智能分析**：使用 AWS Bedrock AI 进行成绩数据分析
- 🔧 **MCP 集成**：通过 Scalebox MCP 在安全沙箱中执行代码
- 📈 **可视化**：使用 Recharts 展示分析图表
- 🎨 **现代界面**：基于 Next.js 14 和 Tailwind CSS
- 🐛 **Debug 模式**：支持自定义系统和用户提示词

## 系统架构

```
用户上传 CSV → Next.js Frontend → API Route → AWS Bedrock AI
                                         ↓
                                    MCP Client
                                         ↓
                                  Scalebox Sandbox
                                         ↓
                               执行 Python 分析代码
                                         ↓
                                   返回分析结果
```

## 前置要求

1. **Node.js** 18+ 和 pnpm
2. **AWS Bedrock** 访问权限
3. **Scalebox** API 密钥
4. **MCP Server** 已配置并运行

## 安装步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# AWS Bedrock 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0

# Scalebox 配置
SCALEBOX_API_KEY=sk-xxx
SCALEBOX_API_URL=https://api.scalebox.dev

# MCP Server 配置
MCP_PYTHON_PATH=/path/to/python
MCP_SERVER_PATH=/path/to/mcp-server/packages/python/server.py
```

### 3. 启动 MCP Server

确保 MCP Server 正在运行。参考 MCP 配置：

```json
{
  "mcpServers": {
    "scalebox-python": {
      "command": "/path/to/python",
      "args": ["/path/to/server.py"],
      "env": {
        "SCALEBOX_API_KEY": "sk-xxx",
        "SCALEBOX_API_URL": "https://api.scalebox.dev"
      }
    }
  }
}
```

### 4. 运行开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 使用说明

### 1. 上传成绩表

- 点击上传区域或拖拽 CSV 文件
- CSV 格式示例：

```csv
学号,姓名,语文,数学,英语,物理,化学
2024001,张三,85,92,78,88,90
2024002,李四,78,85,82,75,88
...
```

### 2. 配置提示词（可选）

在 Debug 模式下，可以自定义：
- **系统提示词**：定义 AI 的角色和任务
- **用户提示词**：指定分析需求

### 3. 开始分析

点击"🚀 开始分析"按钮，系统将：
1. 将 CSV 数据写入 Scalebox 沙箱
2. 安装必要的 Python 包（pandas, matplotlib, numpy）
3. 执行数据分析代码
4. 生成统计结果和图表
5. 由 AI 生成分析报告

### 4. 查看结果

- **分析过程**：实时显示 AI 思考和工具调用
- **分析报告**：查看详细的数据分析报告
- **图表展示**：可视化展示各项指标

## 分析指标

系统会自动分析以下指标：

- 📊 班级平均分
- 📈 各科目平均分、最高分、最低分、标准差
- 🥇 各科目第一名
- 🏆 总分第一名
- 📉 成绩分布情况
- 📊 及格率统计
- 📈 可视化图表

## 技术栈

- **Frontend**: Next.js 14, React 19, TypeScript
- **UI**: Tailwind CSS
- **Charts**: Recharts
- **AI**: AWS Bedrock (Claude 3.5 Sonnet)
- **MCP**: @modelcontextprotocol/sdk
- **Sandbox**: Scalebox
- **CSV**: PapaParse

## 目录结构

```
04-nextjs-analysis-agent/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # API 路由
│   ├── components/
│   │   ├── CSVUploader.tsx       # CSV 上传组件
│   │   ├── AnalysisProcess.tsx   # 分析过程组件
│   │   └── ChartDisplay.tsx      # 图表展示组件
│   ├── lib/
│   │   └── mcp-client.ts         # MCP 客户端
│   ├── types.ts                  # 类型定义
│   ├── layout.tsx                # 布局
│   ├── page.tsx                  # 主页面
│   └── globals.css               # 全局样式
├── package.json
├── tsconfig.json
└── README_zh.md
```

## 常见问题

### 1. MCP 连接失败

确保：
- MCP Server 正在运行
- 环境变量配置正确
- Python 路径正确

### 2. Bedrock 调用失败

检查：
- AWS 凭证是否配置正确
- Region 和 Model ID 是否正确
- 是否有 Bedrock 访问权限

### 3. 分析失败

可能原因：
- CSV 格式不正确
- Scalebox API 密钥无效
- Python 包安装失败

## 开发建议

### 自定义分析逻辑

修改 `app/api/analyze/route.ts` 中的系统提示词，可以调整分析重点。

### 添加新的工具

在 API 路由中添加新的 MCP 工具定义：

```typescript
const tools = {
  your_tool: {
    description: '工具描述',
    parameters: { /* ... */ },
    execute: async (args) => {
      return await callMCPTool('your_tool', args);
    },
  },
};
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

## 相关资源

- [Scalebox 文档](https://docs.scalebox.dev)
- [AWS Bedrock 文档](https://docs.aws.amazon.com/bedrock/)
- [MCP 协议](https://modelcontextprotocol.io/)
- [Next.js 文档](https://nextjs.org/docs)
