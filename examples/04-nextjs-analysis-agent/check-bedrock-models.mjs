#!/usr/bin/env node

import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });

async function listBedrockModels() {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  console.log('\n=== AWS Bedrock 模型检查 ===\n');
  console.log('Region:', region);
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '已设置' : '未设置');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '已设置' : '未设置');
  console.log('AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? '已设置' : '未设置');
  
  try {
    const client = new BedrockClient({ region });
    
    console.log('\n正在获取可用模型列表...\n');
    
    const command = new ListFoundationModelsCommand({});
    const response = await client.send(command);
    
    const models = response.modelSummaries || [];
    console.log(`✅ 找到 ${models.length} 个模型\n`);
    
    // 按提供商分组
    const modelsByProvider = {};
    models.forEach(model => {
      const provider = model.providerName || 'Unknown';
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(model);
    });
    
    // 输出模型列表
    Object.keys(modelsByProvider).sort().forEach(provider => {
      console.log(`\n📦 ${provider}:`);
      modelsByProvider[provider].forEach(model => {
        console.log(`  - ${model.modelId}`);
        console.log(`    名称: ${model.modelName}`);
        console.log(`    状态: ${model.modelLifecycle?.status || 'N/A'}`);
        if (model.inferenceTypesSupported) {
          console.log(`    支持类型: ${model.inferenceTypesSupported.join(', ')}`);
        }
      });
    });
    
    // 检查特定模型
    console.log('\n=== 检查常用模型 ===\n');
    
    const modelsToCheck = [
      'deepseek.v3-v1:0',
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'us.amazon.nova-premier-v1:0',
      'amazon.nova-premier-v1:0',
      'meta.llama3-70b-instruct-v1:0',
    ];
    
    modelsToCheck.forEach(modelId => {
      const found = models.find(m => m.modelId === modelId);
      if (found) {
        console.log(`✅ ${modelId} - 可用`);
      } else {
        console.log(`❌ ${modelId} - 不可用`);
      }
    });
    
    // 推荐模型
    console.log('\n=== 推荐模型（支持工具调用）===\n');
    
    const claudeModels = models.filter(m => m.modelId.includes('claude'));
    if (claudeModels.length > 0) {
      console.log('🌟 Claude 模型（强烈推荐）:');
      claudeModels.forEach(m => {
        console.log(`  - ${m.modelId}`);
      });
    }
    
    const novaModels = models.filter(m => m.modelId.includes('nova'));
    if (novaModels.length > 0) {
      console.log('\n🌟 Nova 模型:');
      novaModels.forEach(m => {
        console.log(`  - ${m.modelId}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    
    if (error.name === 'UnrecognizedClientException') {
      console.log('\n💡 建议:');
      console.log('  - 检查 AWS 凭证是否正确');
      console.log('  - 确保 AWS_REGION 设置正确');
      console.log('  - 验证 IAM 权限是否包含 bedrock:ListFoundationModels');
    }
    
    process.exit(1);
  }
}

listBedrockModels();
