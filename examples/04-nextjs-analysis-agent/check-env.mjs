#!/usr/bin/env node

import { existsSync } from 'fs';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });

console.log('=== 环境配置检查 ===\n');

// 检查 AWS 配置
console.log('1. AWS Bedrock 配置:');
console.log('   AWS_REGION:', process.env.AWS_REGION || '❌ 未设置');
console.log('   AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ 已设置' : '❌ 未设置');
console.log('   AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ 已设置' : '❌ 未设置');
console.log('   AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? '✅ 已设置' : '⚠️  未设置（可选）');
console.log('   BEDROCK_MODEL_ID:', process.env.BEDROCK_MODEL_ID || '⚠️  使用默认值');

console.log('\n2. Scalebox 配置:');
console.log('   SCALEBOX_API_KEY:', process.env.SCALEBOX_API_KEY ? '✅ 已设置' : '❌ 未设置');
console.log('   SCALEBOX_API_URL:', process.env.SCALEBOX_API_URL || '⚠️  使用默认值');

console.log('\n3. MCP Server 配置:');
const pythonPath = process.env.MCP_PYTHON_PATH || '/Users/yindongliang/cloudsway/mcp-server/packages/python/venv/bin/python';
const serverPath = process.env.MCP_SERVER_PATH || '/Users/yindongliang/cloudsway/mcp-server/packages/python/server.py';

console.log('   MCP_PYTHON_PATH:', pythonPath);
console.log('   Python 路径存在:', existsSync(pythonPath) ? '✅ 是' : '❌ 否');
console.log('   MCP_SERVER_PATH:', serverPath);
console.log('   Server 路径存在:', existsSync(serverPath) ? '✅ 是' : '❌ 否');

console.log('\n4. 检查结果:');

const errors = [];
const warnings = [];

if (!process.env.AWS_REGION) errors.push('AWS_REGION 未设置');
if (!process.env.AWS_ACCESS_KEY_ID) errors.push('AWS_ACCESS_KEY_ID 未设置');
if (!process.env.AWS_SECRET_ACCESS_KEY) errors.push('AWS_SECRET_ACCESS_KEY 未设置');
if (!process.env.SCALEBOX_API_KEY) errors.push('SCALEBOX_API_KEY 未设置');
if (!existsSync(pythonPath)) errors.push('Python 路径不存在');
if (!existsSync(serverPath)) errors.push('MCP Server 路径不存在');

if (!process.env.BEDROCK_MODEL_ID) warnings.push('BEDROCK_MODEL_ID 未设置，将使用默认模型');
if (!process.env.SCALEBOX_API_URL) warnings.push('SCALEBOX_API_URL 未设置，将使用默认 URL');

if (errors.length > 0) {
  console.log('\n❌ 发现错误:');
  errors.forEach(err => console.log('   -', err));
}

if (warnings.length > 0) {
  console.log('\n⚠️  警告:');
  warnings.forEach(warn => console.log('   -', warn));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('   ✅ 所有配置正常！');
}

console.log('\n=== 检查完成 ===');

if (errors.length > 0) {
  console.log('\n💡 建议:');
  console.log('   1. 确保 .env.local 文件存在');
  console.log('   2. 参考 ENV_SETUP.md 配置必要的环境变量');
  console.log('   3. 检查 MCP Server 路径是否正确');
  process.exit(1);
}
