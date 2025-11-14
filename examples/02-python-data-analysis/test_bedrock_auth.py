#!/usr/bin/env python3
"""测试 AWS Bedrock 认证配置"""

from dotenv import load_dotenv
import boto3
import os
import json

load_dotenv()

def test_bedrock_connection():
    """测试 Bedrock 连接和认证"""
    
    print("=== AWS 环境配置 ===")
    print(f"AWS_REGION: {os.getenv('AWS_REGION', 'Not set')}")
    print(f"AWS_ACCESS_KEY_ID: {'***' if os.getenv('AWS_ACCESS_KEY_ID') else 'Not set'}")
    print(f"AWS_SECRET_ACCESS_KEY: {'***' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'Not set'}")
    print(f"AWS_SESSION_TOKEN: {'***' if os.getenv('AWS_SESSION_TOKEN') else 'Not set'}")
    print(f"AWS_BEARER_TOKEN_BEDROCK: {'***' if os.getenv('AWS_BEARER_TOKEN_BEDROCK') else 'Not set'}")
    print()
    
    # 如果有 Bearer Token，设置为 Session Token
    bearer_token = os.getenv('AWS_BEARER_TOKEN_BEDROCK')
    if bearer_token:
        print("检测到 AWS_BEARER_TOKEN_BEDROCK，将其设置为 AWS_SESSION_TOKEN")
        os.environ['AWS_SESSION_TOKEN'] = bearer_token
    
    region = os.getenv('AWS_REGION', 'eu-north-1')
    
    try:
        print(f"\n=== 测试 1: 连接到 Bedrock (region: {region}) ===")
        bedrock_client = boto3.client('bedrock', region_name=region)
        
        print("✅ Bedrock 客户端创建成功")
        
        # 列出可用模型
        print("\n=== 测试 2: 列出基础模型 ===")
        response = bedrock_client.list_foundation_models()
        models = response.get('modelSummaries', [])
        print(f"✅ 成功获取 {len(models)} 个模型")
        
        # 查找 DeepSeek 模型
        deepseek_models = [m for m in models if 'deepseek' in m['modelId'].lower()]
        if deepseek_models:
            print(f"\n找到 DeepSeek 模型:")
            for model in deepseek_models:
                print(f"  - {model['modelId']}: {model['modelName']}")
        
        # 测试 Runtime 客户端
        print("\n=== 测试 3: 创建 Bedrock Runtime 客户端 ===")
        runtime_client = boto3.client('bedrock-runtime', region_name=region)
        print("✅ Bedrock Runtime 客户端创建成功")
        
        # 尝试简单调用
        print("\n=== 测试 4: 调用 DeepSeek 模型 ===")
        model_id = "deepseek.v3-v1:0"
        
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": "Say hello in one word"
                }
            ],
            "max_tokens": 10,
            "temperature": 0.7
        }
        
        response = runtime_client.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        print(f"✅ 模型调用成功！")
        print(f"响应: {json.dumps(response_body, indent=2, ensure_ascii=False)}")
        
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        print(f"\n错误类型: {type(e).__name__}")
        
        # 提供诊断建议
        print("\n=== 诊断建议 ===")
        if "AccessDeniedException" in str(e):
            print("• 认证失败，可能的原因：")
            print("  1. AWS_BEARER_TOKEN_BEDROCK 不正确或已过期")
            print("  2. AWS 凭证配置有误（检查 ~/.aws/credentials）")
            print("  3. IAM 权限不足，需要 bedrock:InvokeModel 权限")
            print("  4. 模型访问权限未启用（需要在 AWS Console 中启用）")
        elif "ResourceNotFoundException" in str(e):
            print("• 模型未找到，可能的原因：")
            print("  1. 模型 ID 不正确")
            print("  2. 该 region 不支持此模型")
            print("  3. 模型访问权限未启用")
        else:
            print(f"• 未知错误: {str(e)}")
        
        return False
    
    print("\n=== ✅ 所有测试通过！===")
    return True

if __name__ == "__main__":
    success = test_bedrock_connection()
    exit(0 if success else 1)
