#!/usr/bin/env python3
"""
LangChain + ChatBedrock + Scalebox MCP 智能体示例

使用 LangChain 的经典方式：通过 bind_tools 和多轮对话实现智能体。
展示 LangChain 如何处理工具调用和对话历史管理。
"""

from dotenv import load_dotenv
import os
import logging
from typing import Dict, Any, Optional, Callable
from scalebox import Sandbox

# LangChain 导入
from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from pydantic import BaseModel, Field

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ========== Scalebox MCP 工具定义 ==========

class ScaleboxTools:
    """封装 Scalebox MCP 工具"""

    def __init__(self):
        """初始化 Sandbox 实例"""
        logger.info("创建 Scalebox Sandbox...")
        self.sandbox = Sandbox.create()
        logger.info(f"✅ Sandbox 创建成功，ID: {self.sandbox.sandbox_id}")

        # 安装常用依赖
        # logger.info("安装 Python 依赖...")
        # result = self.sandbox.commands.run(
        #     "pip install pandas matplotlib numpy -q",
        #     timeout=120
        # )
        # if result.exit_code == 0:
        #     logger.info("✅ 依赖安装成功")
        # else:
        #     logger.warning(f"依赖安装警告: {result.stderr}")

    def write_file(self, path: str, content: str) -> str:
        """
        在沙盒中写入文件

        Args:
            path: 文件路径（例如：/tmp/data.csv）
            content: 文件内容

        Returns:
            执行结果描述
        """
        try:
            self.sandbox.files.write(path, content)
            logger.info(f"✅ 文件已写入: {path}")
            return f"成功写入文件: {path}"
        except Exception as e:
            error_msg = f"写入文件失败: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def run_code(self, code: str) -> str:
        """
        在沙盒中执行 Python 代码

        Args:
            code: Python 代码字符串

        Returns:
            代码执行输出
        """
        try:
            # 将代码写入临时文件
            script_path = "/tmp/analysis_script.py"
            self.sandbox.files.write(script_path, code)

            # 执行代码
            logger.info("执行 Python 代码...")
            result = self.sandbox.commands.run(
                f"python {script_path}",
                timeout=60
            )

            output = result.stdout if result.stdout else result.stderr
            logger.info(f"代码执行完成，退出码: {result.exit_code}")

            return f"执行结果:\n{output}\n\n退出码: {result.exit_code}"

        except Exception as e:
            error_msg = f"代码执行失败: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def read_file(self, path: str) -> str:
        """
        从沙盒读取文件内容

        Args:
            path: 文件路径

        Returns:
            文件内容
        """
        try:
            content = self.sandbox.files.read(path)
            logger.info(f"✅ 文件已读取: {path}")
            return f"文件内容:\n{content}"
        except Exception as e:
            error_msg = f"读取文件失败: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def list_files(self, directory: str = "/tmp") -> str:
        """
        列出沙盒目录中的文件

        Args:
            directory: 目录路径

        Returns:
            文件列表
        """
        try:
            result = self.sandbox.commands.run(f"ls -lh {directory}")
            logger.info(f"✅ 列出目录: {directory}")
            return f"目录内容:\n{result.stdout}"
        except Exception as e:
            error_msg = f"列出目录失败: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def cleanup(self):
        """清理资源"""
        logger.info("清理 Sandbox 资源...")
        # Sandbox 会在程序退出时自动清理


# ========== LangChain 工具定义（使用 @tool 装饰器）==========

# 全局 Scalebox 实例（供工具函数使用）
_sandbox_instance = None

def get_sandbox():
    """获取全局 Sandbox 实例"""
    global _sandbox_instance
    if _sandbox_instance is None:
        raise RuntimeError("Sandbox 未初始化")
    return _sandbox_instance


@tool
def write_file(path: str, content: str) -> str:
    """将内容写入沙盒文件系统

    Args:
        path: 文件路径，例如 /tmp/data.csv
        content: 文件内容
    """
    try:
        sandbox = get_sandbox()
        sandbox.files.write(path, content)
        logger.info(f"✅ 文件已写入: {path}")
        return f"成功写入文件: {path}"
    except Exception as e:
        error_msg = f"写入文件失败: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def run_code(code: str) -> str:
    """在沙盒中执行 Python 代码进行数据分析

    Args:
        code: Python 代码字符串，可使用 pandas, matplotlib, numpy
    """
    try:
        sandbox = get_sandbox()
        script_path = "/tmp/analysis_script.py"
        sandbox.files.write(script_path, code)

        logger.info("执行 Python 代码...")
        result = sandbox.commands.run(f"python {script_path}", timeout=60)

        output = result.stdout if result.stdout else result.stderr
        logger.info(f"代码执行完成，退出码: {result.exit_code}")

        return f"执行结果:\n{output}\n\n退出码: {result.exit_code}"
    except Exception as e:
        error_msg = f"代码执行失败: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def read_file(path: str) -> str:
    """从沙盒读取文件内容

    Args:
        path: 文件路径
    """
    try:
        sandbox = get_sandbox()
        content = sandbox.files.read(path)
        logger.info(f"✅ 文件已读取: {path}")
        return f"文件内容:\n{content}"
    except Exception as e:
        error_msg = f"读取文件失败: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def list_files(directory: str = "/tmp") -> str:
    """列出沙盒目录中的文件

    Args:
        directory: 目录路径，默认 /tmp
    """
    try:
        sandbox = get_sandbox()
        result = sandbox.commands.run(f"ls -lh {directory}")
        logger.info(f"✅ 列出目录: {directory}")
        return f"目录内容:\n{result.stdout}"
    except Exception as e:
        error_msg = f"列出目录失败: {str(e)}"
        logger.error(error_msg)
        return error_msg


def run_langchain_agent(scalebox_tools: ScaleboxTools, user_task: str, max_iterations: int = 10):
    """
    使用 LangChain 的经典方式运行智能体

    核心概念：
    1. 使用 @tool 装饰器定义工具
    2. 使用 bind_tools() 将工具绑定到 LLM
    3. 手动管理对话历史（messages list）
    4. 循环处理：LLM 响应 → 工具调用 → 结果反馈 → 下一轮

    Args:
        scalebox_tools: ScaleboxTools 实例
        user_task: 用户任务描述
        max_iterations: 最大迭代次数

    Returns:
        最终结果
    """
    # 设置全局 sandbox 实例
    global _sandbox_instance
    _sandbox_instance = scalebox_tools.sandbox

    # 1️⃣ 创建 LLM 实例
    region = os.getenv('AWS_REGION', 'us-east-1')
    model_id = os.getenv('BEDROCK_MODEL_ID', 'us.amazon.nova-lite-v1:0')

    logger.info(f"配置 ChatBedrock: region={region}, model={model_id}")

    llm = ChatBedrock(
        model_id=model_id,
        region_name=region,
        model_kwargs={
            "temperature": 0.7,
            "max_tokens": 4096,
        }
    )

    # 2️⃣ 定义工具列表
    tools = [write_file, run_code, read_file, list_files]

    # 3️⃣ 将工具绑定到 LLM（这是 LangChain 的核心机制）
    llm_with_tools = llm.bind_tools(tools)
    logger.info(f"✅ 已绑定 {len(tools)} 个工具到 LLM")

    # 4️⃣ 初始化对话历史
    messages = [
        SystemMessage(content="""你是一个专业的数据分析助手，可以使用 Scalebox 沙盒环境执行 Python 代码。

可用工具：
- write_file: 保存文件到沙盒
- run_code: 执行 Python 代码
- read_file: 读取沙盒文件
- list_files: 列出目录文件

工作流程：
1. 使用 write_file 保存数据文件
2. 使用 run_code 执行 Python 分析代码
3. 使用 list_files 确认文件生成
4. 总结分析结果给用户

注意：生成的图表保存到 /tmp/ 目录，Python 代码中可以使用 pandas, matplotlib, numpy"""),
        HumanMessage(content=user_task)
    ]

    # 5️⃣ 智能体循环（LangChain 实现方式）
    for i in range(max_iterations):
        logger.info(f"\n{'='*60}")
        logger.info(f"🔄 Iteration {i+1}/{max_iterations}")
        logger.info(f"{'='*60}")

        # 调用 LLM（带工具绑定）
        logger.info("📤 调用 LLM...")
        response = llm_with_tools.invoke(messages)

        # 将 AI 响应加入对话历史
        messages.append(response)

        logger.info(f"📥 收到响应: {type(response).__name__}")

        # 检查是否有工具调用
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info(f"🔧 检测到 {len(response.tool_calls)} 个工具调用")

            # 处理每个工具调用
            for tool_call in response.tool_calls:
                tool_name = tool_call['name']
                tool_args = tool_call['args']
                tool_call_id = tool_call['id']

                logger.info(f"\n  🛠️  工具: {tool_name}")
                logger.info(f"  📋 参数: {tool_args}")

                # 执行工具（LangChain 会自动路由到对应的 @tool 函数）
                tool_func = None
                for t in tools:
                    if t.name == tool_name:
                        tool_func = t
                        break

                if tool_func:
                    try:
                        # 调用工具函数
                        result = tool_func.invoke(tool_args)
                        logger.info(f"  ✅ 结果: {result[:150]}..." if len(str(result)) > 150 else f"  ✅ 结果: {result}")

                        # 将工具结果加入对话历史（这是关键！）
                        messages.append(ToolMessage(
                            content=str(result),
                            tool_call_id=tool_call_id
                        ))
                    except Exception as e:
                        error_msg = f"工具执行错误: {str(e)}"
                        logger.error(f"  ❌ {error_msg}")
                        messages.append(ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call_id
                        ))
                else:
                    logger.error(f"  ❌ 未找到工具: {tool_name}")

            # 继续下一轮循环，让 LLM 看到工具结果
            continue

        else:
            # 没有工具调用，任务完成
            logger.info("✅ 没有工具调用，任务完成")

            # 提取最终文本
            final_text = response.content if hasattr(response, 'content') else str(response)
            return final_text

    logger.warning(f"⚠️ 达到最大迭代次数 {max_iterations}")
    return "任务未完成（达到最大迭代次数）"


def main():
    """主函数：演示 LangChain + ChatBedrock + Scalebox 智能体"""

    logger.info("=" * 60)
    logger.info("LangChain + ChatBedrock + Scalebox 智能体示例")
    logger.info("=" * 60)

    # 1. 创建 Scalebox 工具
    scalebox_tools = ScaleboxTools()

    try:
        # 2. 准备测试数据
        csv_data = """姓名,数学,语文,英语
张三,85,90,88
李四,92,85,90
王五,78,82,85
赵六,95,88,92
钱七,88,90,87"""

        # 3. 执行智能体任务
        logger.info("\n" + "=" * 60)
        logger.info("开始执行智能体任务")
        logger.info("=" * 60)

        task = f"""请分析以下班级成绩数据：

CSV 数据：
{csv_data}

任务：
1. 保存 CSV 数据到 /tmp/grades.csv
2. 使用 Python 分析数据，计算：
   - 每个学生的总分和平均分
   - 每科的平均分
   - 各科第一名是谁
3. 生成一个柱状图展示各科平均分（保存到 /tmp/chart.png）
4. 总结分析结果

请逐步执行，并给出最终分析报告。"""

        # 执行 LangChain 智能体（经典方式）
        result = run_langchain_agent(scalebox_tools, task)

        # 4. 输出结果
        logger.info("\n" + "=" * 60)
        logger.info("智能体执行完成")
        logger.info("=" * 60)
        logger.info(f"\n最终输出:\n{result}")

        # 5. 列出生成的文件
        logger.info("\n查看生成的文件...")
        files_output = scalebox_tools.list_files("/tmp")
        logger.info(f"\n{files_output}")

    finally:
        # 清理资源
        scalebox_tools.cleanup()

    logger.info("\n✅ 程序执行完成")


if __name__ == "__main__":
    main()
