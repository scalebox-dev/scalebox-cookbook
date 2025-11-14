#!/usr/bin/env node

// 测试 MCP 工具调用
import { config } from 'dotenv';

config({ path: '.env.local' });

async function testMCP() {
  console.log('\n=== 测试 MCP 工具 ===\n');
  
  const { getMCPClient, callMCPTool, closeMCPClient } = await import('./app/lib/mcp-client.ts');
  
  try {
    // 1. 测试 write_file
    console.log('\n1️⃣ 测试 write_file');
    const writeResult = await callMCPTool('write_file', {
      path: '/tmp/test.txt',
      content: 'Hello from MCP test!'
    });
    console.log('✅ write_file 成功');
    console.log('结果:', writeResult);
    
    // 2. 测试 read_file
    console.log('\n2️⃣ 测试 read_file');
    const readResult = await callMCPTool('read_file', {
      path: '/tmp/test.txt'
    });
    console.log('✅ read_file 成功');
    console.log('结果:', readResult);
    
    // 3. 测试 install_packages
    console.log('\n3️⃣ 测试 install_packages');
    const installResult = await callMCPTool('install_packages', {
      packages: 'pandas'
    });
    console.log('✅ install_packages 成功');
    console.log('结果:', installResult);
    
    // 4. 测试 run_code
    console.log('\n4️⃣ 测试 run_code');
    const code = `
import pandas as pd
print("Pandas version:", pd.__version__)
print("Test successful!")
`;
    const runResult = await callMCPTool('run_code', {
      code: code,
      language: 'python'
    });
    console.log('✅ run_code 成功');
    console.log('结果:', runResult);
    
    console.log('\n🎉 所有 MCP 工具测试通过！\n');
    
  } catch (error) {
    console.error('\n❌ MCP 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await closeMCPClient();
  }
}

testMCP();
