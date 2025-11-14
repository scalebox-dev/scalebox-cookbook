#!/usr/bin/env node

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from 'dotenv';

config({ path: '.env.local' });

const region = process.env.AWS_REGION || 'us-east-1';

console.log('\n=== 测试 Bedrock 连接 ===\n');
console.log('Region:', region);

// 常见的模型 ID
const modelsToTest = [
  'us.amazon.nova-premier-v1:0',
  'amazon.nova-premier-v1:0',
  'us.amazon.nova-pro-v1:0',
  'amazon.nova-pro-v1:0',
  'us.amazon.nova-lite-v1:0',
  'amazon.nova-lite-v1:0',
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'meta.llama3-70b-instruct-v1:0',
  'us.meta.llama3-2-90b-instruct-v1:0',
];

const client = new BedrockRuntimeClient({ region });

console.log('开始测试各个模型...\n');

for (const modelId of modelsToTest) {
  try {
    console.log(`测试: ${modelId}`);
    
    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: 'Hello' }],
        },
      ],
      inferenceConfig: {
        maxTokens: 10,
        temperature: 0.7,
      },
    });

    const response = await client.send(command);
    
    if (response.output?.message?.content?.[0]?.text) {
      console.log(`✅ ${modelId} - 可用`);
      console.log(`   响应: ${response.output.message.content[0].text.substring(0, 50)}...\n`);
      
      // 找到第一个可用的就停止
      console.log(`\n🎉 找到可用模型: ${modelId}`);
      console.log(`\n请在 .env.local 中设置：`);
      console.log(`BEDROCK_MODEL_ID=${modelId}`);
      break;
    }
  } catch (error) {
    console.log(`❌ ${modelId} - 不可用: ${error.message}\n`);
  }
}

console.log('\n=== 测试完成 ===');
