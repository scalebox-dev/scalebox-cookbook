from dotenv import load_dotenv
import boto3
import json
import logging
import os
from scalebox import Sandbox

load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def generate_csv_data_with_bedrock(prompt: str, model_id: str = "deepseek.v3-v1:0") -> str:
    """
    使用 AWS Bedrock 调用 DeepSeek 模型生成 CSV 数据
    
    Args:
        prompt: 生成数据的提示词，应明确指定输出 CSV 格式
        model_id: Bedrock 模型 ID
        
    Returns:
        生成的 CSV 格式数据
    """
    try:
        # 获取 AWS 配置
        region = os.getenv('AWS_REGION', 'eu-north-1')  # 默认使用 eu-north-1
        bearer_token = os.getenv('AWS_BEDROCK_TOKEN')
        
        # 创建 Bedrock Runtime 客户端
        # 如果有 Bearer Token，将其设置为环境变量供 boto3 使用
        if bearer_token:
            os.environ['AWS_SESSION_TOKEN'] = bearer_token
            logger.info("使用 Bearer Token 认证")
        
        client = boto3.client(
            'bedrock-runtime',
            region_name=region
        )
        
        logger.info(f"连接到 AWS Region: {region}")
        
        # 构建严格的 CSV 输出要求的 prompt
        csv_prompt = f"""你是一个数据生成助手。请严格按照以下要求生成数据：

1. 输出格式：必须是纯CSV格式（逗号分隔值）
2. 第一行：必须是列名（表头）
3. 数据要求：真实、合理、多样化
4. 不要包含任何解释性文字，只输出CSV内容
5. 不要使用markdown代码块标记（如```csv）

任务：{prompt}

请直接输出CSV数据："""
        
        logger.info(f"调用 Bedrock 模型: {model_id}")
        
        # 调用 Bedrock API（DeepSeek 模型格式）
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": csv_prompt
                }
            ],
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.9
        }
        
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )
        
        # 解析响应
        response_body = json.loads(response['body'].read())
        logger.info("成功收到 Bedrock 响应")
        
        # 提取生成的文本
        csv_content = response_body['choices'][0]['message']['content']
        
        # 清理可能存在的 markdown 标记
        csv_content = csv_content.replace('```csv', '').replace('```', '').strip()
        
        return csv_content
        
    except Exception as e:
        logger.error(f"调用 Bedrock 失败: {str(e)}")
        raise


def save_csv_to_sandbox(sandbox: Sandbox, csv_content: str, filename: str = "generated_data.csv") -> str:
    """
    将 CSV 数据保存到 Sandbox 文件系统
    
    Args:
        sandbox: Sandbox 实例
        csv_content: CSV 格式的内容
        filename: 保存的文件名
        
    Returns:
        保存的文件路径
    """
    try:
        # 在 Sandbox 中创建文件
        file_path = f"/tmp/{filename}"
        
        # 使用 Sandbox 的 files.write 接口写入数据
        sandbox.files.write(file_path, csv_content)
        
        logger.info(f"CSV 数据已保存到 Sandbox: {file_path}")
        
        # 验证文件是否创建成功
        file_info = sandbox.files.read(file_path)
        logger.info(f"文件大小: {len(file_info)} 字节")
        
        return file_path
        
    except Exception as e:
        logger.error(f"保存文件到 Sandbox 失败: {str(e)}")
        raise


def main():
    """主函数：演示使用 AI 生成 CSV 数据并存储到 Sandbox"""
    
    logger.info("="*60)
    logger.info("CSV 数据生成演示")
    logger.info("使用 AWS Bedrock DeepSeek + Scalebox Sandbox")
    logger.info("="*60)
    
    # 步骤 1: 创建 Sandbox 实例
    logger.info("\n[步骤 1/6] 创建 Sandbox 实例...")
    sandbox = Sandbox.create()
    logger.info(f"✓ Sandbox 创建成功，ID: {sandbox.sandbox_id}")
    
    try:
        # 步骤 2: 定义数据生成任务
        logger.info("\n[步骤 2/6] 定义数据生成任务...")
        
        # 可选的数据生成任务示例
        data_tasks = [
            {
                "name": "用户数据",
                "prompt": "生成100条用户数据，包含：用户ID、姓名、年龄、性别、邮箱、注册日期",
                "filename": "users.csv"
            },
            {
                "name": "销售数据",
                "prompt": "生成50条销售记录，包含：订单ID、产品名称、数量、单价、总价、销售日期、销售员",
                "filename": "sales.csv"
            },
            {
                "name": "产品库存",
                "prompt": "生成30条产品库存数据，包含：产品ID、产品名称、分类、库存数量、价格、供应商",
                "filename": "inventory.csv"
            }
        ]
        
        # 选择要生成的数据（可以修改索引选择不同的任务）
        selected_task = data_tasks[0]
        logger.info(f"✓ 已选择任务: {selected_task['name']}")
        logger.info(f"  提示词: {selected_task['prompt']}")
        
        # 步骤 3: 调用 Bedrock AI 生成 CSV 数据
        logger.info("\n[步骤 3/6] 调用 AWS Bedrock DeepSeek 生成数据...")
        csv_content = generate_csv_data_with_bedrock(selected_task['prompt'])
        logger.info(f"✓ 数据生成成功，共 {len(csv_content)} 字符")
        
        # 显示数据预览
        preview_lines = csv_content.split('\n')[:6]
        logger.info(f"\n数据预览（前6行）:")
        for line in preview_lines:
            logger.info(f"  {line}")
        
        # 步骤 4: 保存到 Sandbox
        logger.info(f"\n[步骤 4/6] 保存数据到 Sandbox...")
        file_path = save_csv_to_sandbox(sandbox, csv_content, selected_task['filename'])
        logger.info(f"✓ 文件已保存: {file_path}")
        
        # 步骤 5: 验证数据
        logger.info(f"\n[步骤 5/6] 验证保存的数据...")
        
        # 统计行数
        result = sandbox.commands.run(f"wc -l {file_path}")
        line_count = result.stdout.strip().split()[0]
        logger.info(f"✓ 数据行数: {line_count} 行（包含表头）")
        
        # 检查文件大小
        result = sandbox.commands.run(f"du -h {file_path}")
        file_size = result.stdout.strip().split()[0]
        logger.info(f"✓ 文件大小: {file_size}")
        
        # 步骤 6: 显示摘要
        logger.info("\n[步骤 6/6] 生成完成摘要")
        logger.info("="*60)
        logger.info("✅ CSV 数据生成成功！")
        logger.info("="*60)
        logger.info(f"数据集名称: {selected_task['name']}")
        logger.info(f"文件位置: {file_path}")
        logger.info(f"数据行数: {line_count} 行")
        logger.info(f"文件大小: {file_size}")
        logger.info(f"Sandbox ID: {sandbox.sandbox_id}")
        logger.info("="*60)
        
        # 提示如何访问数据
        logger.info("\n💡 如何使用生成的数据:")
        logger.info("  1. 数据已保存在 Sandbox 的 /tmp 目录")
        logger.info("  2. 可以通过 sandbox.files.read() 读取数据")
        logger.info("  3. 可以在 Sandbox 中运行命令处理数据")
        logger.info(f"  4. Sandbox ID 可用于后续连接: {sandbox.sandbox_id}")
        
    except Exception as e:
        logger.error(f"\n❌ 执行失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    
    finally:
        # 清理资源
        logger.info("\n[清理] 关闭 Sandbox...")
        sandbox.kill()
        logger.info("✓ Sandbox 已关闭")
        logger.info("\n演示完成！\n")


if __name__ == "__main__":
    main()
