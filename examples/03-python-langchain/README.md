# LangChain + ChatBedrock + Scalebox 智能体示例

使用 LangChain 创建智能体，调用 AWS Bedrock 大语言模型，在 Scalebox 沙盒环境中执行 Python 数据分析任务。

## 🎯 功能特点

- ✅ **LangChain 智能体框架**：使用 `create_tool_calling_agent` 创建工具调用智能体
- ✅ **ChatBedrock 集成**：调用 AWS Bedrock 的 LLM（默认使用 Nova Lite）
- ✅ **Scalebox MCP 工具**：在隔离沙盒环境中执行代码
- ✅ **自动化工作流**：智能体自主决定调用哪些工具来完成任务

## 📋 核心组件

### 1. Scalebox MCP 工具

封装了 4 个 Scalebox 操作作为 LangChain 工具：

```python
- write_file: 保存文件到沙盒
- run_code: 执行 Python 代码
- read_file: 读取沙盒文件
- list_files: 列出目录文件
```

### 2. LangChain 智能体

使用 `create_tool_calling_agent` 创建智能体，自动：
- 理解用户任务
- 决定调用哪些工具
- 组合工具结果
- 生成最终分析报告

### 3. ChatBedrock LLM

使用 AWS Bedrock 的大语言模型：
- 默认：`us.amazon.nova-lite-v1:0`
- 可配置其他模型（通过环境变量）

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install scalebox langchain langchain-aws boto3 python-dotenv
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# AWS 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# 可选：指定 Bedrock 模型
BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0
```

### 3. 运行示例

```bash
python run.py
```

## 📊 示例任务

智能体会自动执行以下流程：

1. **保存数据**：将 CSV 数据写入沙盒 `/tmp/grades.csv`
2. **执行分析**：运行 Python 代码计算统计信息
3. **生成图表**：创建柱状图展示各科平均分
4. **总结报告**：输出分析结果

## 🔧 工作流程

```
用户任务
  ↓
LangChain 智能体
  ↓
┌─────────────────────────────────┐
│ ChatBedrock (AWS Bedrock LLM)   │
│ ↓                               │
│ 决策：需要调用 write_file       │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ Scalebox 沙盒                   │
│ ✅ 写入文件成功                 │
└─────────────────────────────────┘
  ↓
ChatBedrock 收到结果
  ↓
决策：需要调用 run_code
  ↓
执行 Python 分析代码
  ↓
...循环直到任务完成...
  ↓
输出最终分析报告
```

## 🎨 关键代码

### 创建 Scalebox 工具

```python
class ScaleboxTools:
    def __init__(self):
        self.sandbox = Sandbox.create()
    
    def write_file(self, path: str, content: str) -> str:
        self.sandbox.files.write(path, content)
        return f"成功写入文件: {path}"
    
    def run_code(self, code: str) -> str:
        script_path = "/tmp/analysis_script.py"
        self.sandbox.files.write(script_path, code)
        result = self.sandbox.commands.run(f"python {script_path}")
        return f"执行结果:\n{result.stdout}"
```

### 创建 LangChain 智能体

```python
from langchain_aws import ChatBedrock
from langchain.agents import create_tool_calling_agent, AgentExecutor

# 配置 LLM
llm = ChatBedrock(
    model_id="us.amazon.nova-lite-v1:0",
    region_name="us-east-1"
)

# 创建智能体
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# 执行任务
result = agent_executor.invoke({"input": "请分析这份数据..."})
```

## 📝 输出示例

```
============================================================
LangChain + ChatBedrock + Scalebox 智能体示例
============================================================

创建 Scalebox Sandbox...
✅ Sandbox 创建成功，ID: sbx_xxxxx
安装 Python 依赖...
✅ 依赖安装成功

创建 LangChain 工具...
✅ 已创建 4 个工具

创建智能体...
✅ 智能体创建成功

============================================================
开始执行智能体任务
============================================================

> 调用工具: write_file
✅ 文件已写入: /tmp/grades.csv

> 调用工具: run_code
执行 Python 代码...
✅ 代码执行完成

> 调用工具: list_files
目录内容: grades.csv, chart.png, analysis_script.py

============================================================
智能体执行完成
============================================================

最终输出:
分析报告：
1. 总分排名：赵六(275分) > 李四(267分) > 钱七(265分)
2. 各科平均分：数学 87.6, 语文 87.0, 英语 88.4
3. 各科第一名：数学-赵六, 语文-张三, 英语-赵六
4. 图表已生成：/tmp/chart.png

✅ 程序执行完成
```

## 🔍 与直接调用的区别

### 传统方式（手动编排）

```python
# 1. 手动写文件
sandbox.files.write("/tmp/data.csv", csv_content)

# 2. 手动执行代码
result = sandbox.commands.run("python analyze.py")

# 3. 手动读取结果
output = sandbox.files.read("/tmp/results.json")

# 4. 手动调用 LLM 生成报告
report = bedrock.invoke("分析结果：" + output)
```

### LangChain 智能体方式（自动化）

```python
# 一句话完成所有步骤
result = agent_executor.invoke({
    "input": "请分析这份数据并生成报告"
})
# 智能体自动决定：
# 1. 需要先保存文件 → 调用 write_file
# 2. 需要分析数据 → 调用 run_code
# 3. 需要查看结果 → 调用 read_file
# 4. 生成最终报告 → 返回给用户
```

## 📦 依赖项

```txt
scalebox>=0.1.0
langchain>=0.1.0
langchain-aws>=0.1.0
boto3>=1.34.0
python-dotenv>=1.0.0
```

## 🎯 扩展建议

1. **添加更多工具**：数据库查询、API 调用等
2. **优化提示词**：针对特定任务调整系统提示
3. **保存中间结果**：记录智能体决策过程
4. **错误处理**：增强工具调用的容错性

## 📚 参考资料

- [LangChain 文档](https://python.langchain.com/docs/get_started/introduction)
- [LangChain AWS 集成](https://python.langchain.com/docs/integrations/chat/bedrock)
- [Scalebox 文档](https://docs.scalebox.ai/)
- [AWS Bedrock](https://aws.amazon.com/bedrock/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
