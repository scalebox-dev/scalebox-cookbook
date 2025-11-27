import { Sandbox, SandboxApi } from "@scalebox/sdk";
import { config } from "dotenv";

// 加载 .env 文件
config();

/**
 * 创建 Node.js 模板
 */
async function main() {
  let sandbox: Sandbox | null = null;

  try {
    console.log("🚀 开始创建 Node.js 模板...\n");

    // 检查 API Key
    const apiKey = process.env.SCALEBOX_API_KEY;
    if (!apiKey) {
      throw new Error(
        "❌ 错误: 需要设置 SCALEBOX_API_KEY 环境变量\n" +
          "请在项目根目录创建 .env 文件并添加: SCALEBOX_API_KEY=your_api_key"
      );
    }

    // 1. 创建 Scalebox 沙盒（设置端口号）
    console.log("📦 正在创建 Scalebox 沙盒...");
    console.log("   配置端口: 5173 (vite), 3000 (frontend), 8000 (backend)");

    sandbox = await Sandbox.create("base", {
      apiKey: apiKey,
      timeoutMs: 600000, // 10 分钟超时
      metadata: {
        project: "nodejs-template",
        description: "Node.js 24 with nvm template",
      },
      // 注意：端口配置可能需要通过其他方式设置，这里先创建沙盒
      envs: {},
    });
    console.log(`✅ 沙盒创建成功，ID: ${sandbox.sandboxId}\n`);

    // 2. 更新 apt 包列表
    console.log("📦 正在更新 apt 包列表...");
    const aptUpdateResult = await sandbox.commands.run("apt update", {
      timeoutMs: 60000,
    });
    if (aptUpdateResult.exitCode !== 0) {
      throw new Error(`apt update 失败: ${aptUpdateResult.stderr}`);
    }
    console.log("✅ apt 更新完成\n");

    // 3. 安装 nvm
    console.log("📦 正在安装 nvm...");
    const nvmInstallResult = await sandbox.commands.run(
      `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash`,
      { timeoutMs: 120000 }
    );
    if (nvmInstallResult.exitCode !== 0) {
      throw new Error(`nvm 安装失败: ${nvmInstallResult.stderr}`);
    }
    console.log("✅ nvm 安装完成\n");

    // 4. 将 nvm 写入 .bash_profile（覆盖方式，如 README 所示）
    console.log("📝 正在配置 .bash_profile...");
    const bashProfileResult = await sandbox.commands.run(
      `echo '. "$HOME/.nvm/nvm.sh"' > ~/.bash_profile`,
      { timeoutMs: 10000 }
    );
    if (bashProfileResult.exitCode !== 0) {
      throw new Error(`配置 .bash_profile 失败: ${bashProfileResult.stderr}`);
    }
    console.log("✅ .bash_profile 配置完成\n");

    // 5. 安装 Node.js 24
    console.log("📦 正在安装 Node.js 24...");
    const nodeInstallResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && nvm install 24`,
      { timeoutMs: 300000 } // 5 分钟超时用于安装 Node.js
    );
    if (nodeInstallResult.exitCode !== 0) {
      throw new Error(`Node.js 安装失败: ${nodeInstallResult.stderr}`);
    }
    console.log("✅ Node.js 24 安装完成\n");

    // 6. 验证 Node.js 和 npm 版本
    console.log("🔍 正在验证安装...");
    const nodeVersionResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && node -v`,
      { timeoutMs: 10000 }
    );
    const npmVersionResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && npm -v`,
      { timeoutMs: 10000 }
    );

    const nodeVersion = nodeVersionResult.stdout.trim();
    const npmVersion = npmVersionResult.stdout.trim();

    console.log(`   Node.js 版本: ${nodeVersion}`);
    console.log(`   npm 版本: ${npmVersion}\n`);

    // 验证版本是否符合预期
    if (!nodeVersion.includes("v24")) {
      console.warn(`⚠️  警告: Node.js 版本不是 v24，当前版本: ${nodeVersion}`);
    }
    if (!npmVersion.includes("11")) {
      console.warn(`⚠️  警告: npm 版本不是 11.x，当前版本: ${npmVersion}`);
    }

    // 7. 创建模板
    console.log("📦 正在将沙盒保存为模板...");
    
    // 模板配置 - 使用时间戳避免重复
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
    const templateName = process.env.TEMPLATE_NAME || `nodejs-${timestamp}`;
    const templateDescription = process.env.TEMPLATE_DESCRIPTION || 
      `Node.js ${nodeVersion} with nvm template (npm ${npmVersion})`;
    
    const templateResult = await SandboxApi.createTemplateFromSandbox(
      sandbox.sandboxId,
      {
        apiKey: apiKey,
        apiUrl: process.env.SCALEBOX_API_URL,
        name: templateName,
        description: templateDescription,
        isPublic: false,
        // 端口配置：5173 (vite), 3000 (frontend), 8000 (backend)
        // ports 格式为 JSON 字符串
        ports: JSON.stringify([
          { port: 5173, name: "vite" },
          { port: 3000, name: "frontend" },
          { port: 8000, name: "backend" },
        ]),
      }
    );
    
    console.log("✅ 模板创建成功！\n");

    // 8. 输出完成信息
    console.log("=".repeat(60));
    console.log("🎉 Node.js 模板创建完成！");
    console.log("=".repeat(60));
    console.log(`📦 沙盒 ID: ${sandbox.sandboxId}`);
    console.log(`📋 模板名称: ${templateName}`);
    console.log(`📋 模板描述: ${templateDescription}`);
    console.log(`📋 Node.js: ${nodeVersion}`);
    console.log(`📋 npm: ${npmVersion}`);
    console.log(`📋 模板信息:`, JSON.stringify(templateResult, null, 2));
    console.log("=".repeat(60));
    console.log("\n💡 端口配置：");
    console.log("   - 5173 for vite");
    console.log("   - 3000 for frontend");
    console.log("   - 8000 for backend");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ 创建失败:");
    console.error(error instanceof Error ? error.message : String(error));
    if (sandbox) {
      console.error(`\n沙盒 ID: ${sandbox.sandboxId}`);
      console.error("你可以手动访问沙盒继续配置");
    }
    process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error("未处理的错误:", error);
  process.exit(1);
});
