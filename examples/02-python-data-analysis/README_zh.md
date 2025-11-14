# CSV 数据智能分析系统

基于 AWS Bedrock DeepSeek 和 Scalebox 的智能数据分析工具，能够自动执行多维度统计分析、生成精美可视化图表，并通过 AI 生成专业分析报告。

> 💡 **学习路径**：本示例基于 [01-python-gen-data](../01-python-gen-data) 生成的数据进行分析。建议先完成数据生成示例。

## 📋 项目简介

本示例展示如何对 CSV 数据进行全面的智能分析：
- 多达 8+ 个统计维度（平均值、最高值、标准差、及格率等）
- 10+ 种排名分析（各科第一名、前三名、总分排名等）
- 5 张精美可视化图表（柱状图、箱线图、雷达图等）
- AI 生成的专业分析报告（趋势分析、改进建议）
- 输出精美的 HTML 格式报告，支持直接在浏览器中查看

## ✨ 核心功能

### 📊 多维度统计分析
- ✅ **基本统计**：自动计算平均分、最高分、最低分、标准差
- ✅ **及格率分析**：可自定义及格线，计算各科及格率
- ✅ **分布分析**：数据分布、四分位数、离群值检测
- ✅ **自动识别**：智能识别数值列，排除姓名、学号等非数值列

### 🏆 排名分析系统
- ✅ **各科第一名**：自动找出每个科目的最高分学生
- ✅ **总分排名**：计算总分并生成前三名榜单
- ✅ **平均分排名**：找出综合表现最优秀的学生
- ✅ **各科前三名**：详细展示每个科目的前三名

### 📈 数据可视化（5 张图表）
1. **各科平均分对比图** - 柱状图展示，含及格线
2. **总分分布直方图** - 展示正态分布情况
3. **各科成绩箱线图** - 显示分布、中位数、离群值
4. **前三名学生雷达图** - 多维度对比优秀学生
5. **及格率对比图** - 各科达标率，含目标线

### 🤖 AI 智能分析报告
利用 Bedrock DeepSeek 自动生成：
- **整体表现分析**：全班整体水平评估
- **优秀学生特点**：top 学生的特征分析
- **学科难度分析**：识别难度较大的科目
- **改进建议**：针对性的提升建议
- **趋势预测**：基于数据的未来趋势

### 🌐 HTML 精美报告
- ✅ **现代化设计**：紫蓝渐变色主题，美观大方
- ✅ **响应式布局**：完美适配桌面、平板、手机
- ✅ **图表嵌入**：base64 编码，单文件自包含
- ✅ **自动打开**：生成后自动在浏览器打开（macOS）
- ✅ **导出 PDF**：支持直接打印或导出 PDF

## 🔄 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                  CSV 数据分析完整流程                          │
└─────────────────────────────────────────────────────────────┘

[1] 创建 Sandbox 实例
     ↓
[2] 安装分析依赖
     - pandas（数据处理）
     - matplotlib（图表生成）
     - numpy（数值计算）
     ↓
[3] 生成或加载测试数据
     - 选项A：自动生成 40 人班级成绩
     - 选项B：上传你自己的 CSV 文件
     ↓
[4] 执行多维度数据分析
     - 计算统计指标（8+ 维度）
     - 生成排名榜单（10+ 种）
     - 创建可视化图表（5 张）
     ↓
[5] 准备数据摘要
     - 提取关键统计信息
     - 格式化为结构化描述
     ↓
[6] 调用 Bedrock AI 生成分析报告
     - 发送数据摘要
     - 接收专业分析报告
     ↓
[7] 生成精美 HTML 报告
     - 嵌入所有图表（base64）
     - 应用 CSS 样式
     - 生成单文件报告
     ↓
[8] 输出和展示
     - 保存到本地 ./output/analysis_report.html
     - 自动在浏览器中打开
     ↓
✅ 完整的数据分析报告就绪！
```

## 环境要求

### 安装依赖

```bash
pip install boto3 python-dotenv scalebox
```

### 环境配置

复制 `.env.example` 为 `.env` 并配置：

```bash
# Scalebox API 密钥
SBX_API_KEY="your_scalebox_api_key"

# AWS Bedrock 配置
AWS_REGION="eu-north-1"  # 根据你的模型所在区域设置

# 方式 1: 使用 Bearer Token（推荐）
AWS_BEARER_TOKEN_BEDROCK="your_bearer_token"

# 方式 2: 使用标准 AWS 凭证（可选）
# AWS_ACCESS_KEY_ID="your_aws_access_key"
# AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
```

### AWS Bedrock 权限

确保具有以下权限：
- `bedrock:InvokeModel` - 调用模型生成分析报告
- 访问 `deepseek.v3-v1:0` 模型的权限

**重要**：在 AWS Console 的 Bedrock 服务中启用模型访问：
1. 进入 AWS Bedrock 控制台
2. 选择 "Model access"
3. 启用 "DeepSeek-V3.1" 模型

## 🚀 快速开始

### 方式一：使用自动生成的测试数据（推荐）

```bash
# 直接运行，会自动生成 40 人班级成绩数据
python run.py
```

程序会自动：
1. ✅ 生成测试数据（40 人班级，6 个科目）
2. ✅ 执行完整分析
3. ✅ 生成 5 张图表
4. ✅ 调用 AI 生成报告
5. ✅ 输出 HTML 报告并自动打开

### 方式二：分析现有 CSV 文件

如果你有自己的 CSV 数据文件：

```python
# 修改 run.py 中的 main() 函数

# 1. 注释掉自动生成数据的步骤 3
# 2. 添加上传你的 CSV 文件的代码

csv_content = open("your_data.csv", "r", encoding="utf-8").read()
sandbox.files.write("/tmp/data.csv", csv_content)
csv_path = "/tmp/data.csv"

# 3. 继续执行分析
analysis_results = analyze_csv_in_sandbox(sandbox, csv_path)
```

### 方式三：编程方式调用

```python
from run import (
    analyze_csv_in_sandbox,
    call_bedrock_for_analysis,
    generate_analysis_report
)
from scalebox import Sandbox

# 创建 Sandbox
sandbox = Sandbox.create()

# 上传你的 CSV 文件
with open("student_scores.csv", "r", encoding="utf-8") as f:
    sandbox.files.write("/tmp/data.csv", f.read())

# 执行分析
results = analyze_csv_in_sandbox(sandbox, "/tmp/data.csv")

# 准备数据摘要
summary = f"""
学生总数: {results['basic_stats']['student_count']}
科目: {', '.join(results['basic_stats']['subjects'])}
平均分最高: {results['rankings']['avg_first']['name']}
...
"""

# 生成 AI 报告
ai_report = call_bedrock_for_analysis(summary)

# 生成完整 HTML 报告
report_path = generate_analysis_report(sandbox, results, ai_report)

# 下载报告
report_content = sandbox.files.read(report_path)
with open("./output/report.html", "w", encoding="utf-8") as f:
    f.write(report_content)

# 清理
sandbox.kill()
```

## 📊 输出结果

### 终端输出示例

```
============================================================
✅ 分析完成！结果摘要:
============================================================
📊 统计维度: 8 个
   - 语文、数学、英语、物理、化学、生物
   - 总分、平均分

🏆 排名类别: 10+ 个
   - 各科第一名 × 6
   - 总分前三名
   - 各科前三名榜单

📈 生成图表: 5 张（已嵌入 HTML）
   - chart_avg_scores.png       (各科平均分)
   - chart_total_distribution.png (总分分布)
   - chart_boxplot.png           (成绩箱线图)
   - chart_radar_top3.png        (前三名雷达图)
   - chart_pass_rates.png        (及格率对比)

📄 HTML 报告: ./output/analysis_report.html
   - 文件大小: ~2.5 MB
   - 包含所有图表和统计数据
   - 已在浏览器中打开
============================================================
```

### HTML 报告结构

```
├─ 一、基本信息（卡片展示）
│  ├─ 学生总数: 40 人
│  ├─ 考试科目: 语文、数学、英语、物理、化学、生物
│  ├─ 统计维度: 8 个
│  └─ 生成图表: 5 张
│
├─ 二、各科统计数据（表格）
│  └─ 平均分、最高分、最低分、标准差、及格率
│
├─ 三、优秀学生榜 🏆
│  ├─ 🥇 各科第一名（卡片网格）
│  ├─ 🏅 总分前三名（带奖牌）
│  └─ 📋 各科前三名详情
│
├─ 四、数据可视化图表 📈
│  └─ 5 张高清图表（base64 嵌入）
│
└─ 五、AI 智能分析 🤖
   └─ Bedrock 生成的专业分析报告
```

## 🌐 HTML 报告特性

### 视觉设计
- **渐变色主题**：紫蓝渐变 (#667eea → #764ba2)
- **卡片式布局**：信息分块清晰，层次分明
- **响应式设计**：自动适配桌面、平板、手机
- **悬浮动画**：鼠标悬停卡片上移，增强交互
- **打印优化**：支持直接打印或导出 PDF

### 技术亮点
- **图表嵌入**：5 张图表使用 base64 编码直接嵌入
- **单文件自包含**：无需额外图片文件，便于分享
- **文件大小**：通常 1-3 MB（含高清图表）
- **浏览器兼容**：Chrome、Firefox、Safari 完美支持

### 查看和分享报告

**自动打开**（macOS）：
```bash
python run.py
# 完成后自动在浏览器打开
```

**手动打开**：
```bash
# 方式 1: 命令行
open ./output/analysis_report.html

# 方式 2: 双击文件
# 在文件管理器中双击 analysis_report.html

# 方式 3: 拖拽到浏览器
```

**导出 PDF**：
1. 在浏览器中打开报告
2. 按 `Ctrl+P` (Windows) 或 `Cmd+P` (macOS)
3. 选择"另存为 PDF"
4. 调整页面设置，保存

**分享给他人**：
- ✅ 邮件附件发送 HTML 文件
- ✅ 上传到云端分享链接
- ✅ 嵌入到网页 `<iframe>`
- ✅ 转换为 PDF 分享

## 🔧 自定义分析

### 修改及格线

```python
# 在 analyze_csv_in_sandbox 函数中修改
pass_threshold = 60  # 改为你需要的及格分数
```

### 添加新的统计维度

```python
# 在分析脚本中添加新的计算
analysis_script = """
# 添加你的自定义分析
df['rank'] = df['总分'].rank(ascending=False)
top_10_percent = df.nlargest(int(len(df) * 0.1), '总分')
...
"""
```

### 自定义图表样式

```python
# 修改图表生成函数中的样式参数
plt.rcParams['font.family'] = 'Arial'  # 修改字体
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']  # 修改颜色
```

## 常见问题

### 1. 如何分析非成绩类的 CSV 数据？

程序会自动识别数值列进行分析。你只需要：
1. 准备好 CSV 文件（确保有数值列）
2. 上传到 Sandbox
3. 运行分析即可

示例：分析销售数据
```python
# 你的 sales.csv 包含: 订单ID, 销售员, 销售额, 数量, 日期
# 程序会自动分析 "销售额" 和 "数量" 这两个数值列
```

### 2. 生成的图表中文显示乱码

```python
# 在 Sandbox 中安装中文字体支持
sandbox.commands.run("""
apt-get update && apt-get install -y fonts-wqy-zenhei
fc-cache -fv
""")
```

### 3. 报告文件太大

减小图表 DPI 来降低文件大小：
```python
# 在图表保存时修改 DPI
plt.savefig(chart_path, dpi=80, bbox_inches='tight')  # 默认是 100
```

### 4. 想要更详细的 AI 分析

修改 prompt 使其更详细：
```python
prompt = f"""
请提供一份非常详细的分析报告，包括：
1. 详细的数据分布分析
2. 每个学生的个性化评价
3. 每个科目的深入分析
4. 具体的提升建议（至少5条）
5. 数据异常和离群值分析
...

数据摘要：
{summary}
"""
```

### 5. AWS 认证失败

参考 [01-python-gen-data](../01-python-gen-data) 中的常见问题部分。

## 最佳实践

1. **数据准备**：确保 CSV 格式正确，包含足够的数值列
2. **Prompt 优化**：根据实际需求调整 AI 分析 prompt
3. **资源管理**：分析完成后及时清理 Sandbox
4. **报告保存**：定期备份重要的分析报告
5. **性能优化**：大数据集时考虑采样分析

## 🏗️ 技术架构

```
┌───────────────────────────────────────────────────────────┐
│                  CSV 数据分析架构                           │
└───────────────────────────────────────────────────────────┘

┌──────────────────┐
│ run.py │
│  (Python 脚本)   │
└────────┬─────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │      Scalebox Sandbox           │
    │  ├─ pandas (数据处理)           │
    │  ├─ matplotlib (图表生成)       │
    │  ├─ numpy (数值计算)            │
    │  └─ CSV 文件存储                │
    └────────┬────────────────────────┘
             │
             ├─────────────┐
             │             │
             ▼             ▼
    ┌────────────┐  ┌──────────────────┐
    │  统计分析  │  │  AWS Bedrock API │
    │  图表生成  │  │  (DeepSeek v3)   │
    │           │  │  AI 分析报告     │
    └────────┬──┘  └─────┬────────────┘
             │            │
             ▼            ▼
    ┌─────────────────────────────────────────┐
    │          HTML 报告生成                   │
    │  ├─ 嵌入统计数据                         │
    │  ├─ 嵌入 base64 图表                    │
    │  ├─ 嵌入 AI 分析报告                     │
    │  └─ 应用 CSS 样式                       │
    └────────┬────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │     输出结果                             │
    │  - HTML 报告 (./output/*.html)          │
    │  - 图表文件 (Sandbox /tmp/*.png)         │
    │  - 自动在浏览器打开                      │
    └─────────────────────────────────────────┘
```

## 许可证

请遵循 Scalebox 和 AWS Bedrock 的使用条款。

## 相关资源

- [Scalebox 文档](https://docs.scalebox.dev)
- [AWS Bedrock 文档](https://docs.aws.amazon.com/bedrock/)
- [pandas 文档](https://pandas.pydata.org/docs/)
- [matplotlib 文档](https://matplotlib.org/)

## 贡献

欢迎提交 Issue 和 Pull Request！
