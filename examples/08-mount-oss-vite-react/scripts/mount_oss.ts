import { Sandbox } from "@scalebox/sdk";
import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

// 加载 .env 文件
config();

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 主函数：通过挂载 OSS 部署 Vite React 应用到 Scalebox 沙盒
 */
async function main() {
  let sandbox: Sandbox | null = null;

  try {
    console.log("🚀 开始通过挂载 OSS 部署 Vite React 应用到 Scalebox 沙盒...\n");

    // 检查必需的环境变量
    const apiKey = process.env.SCALEBOX_API_KEY;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3Bucket = process.env.S3_BUCKET;
    const s3Region = process.env.S3_REGION || "us-east-1";
    const s3Folder = process.env.S3_FOLDER || "frontend"; // OSS bucket 中的文件夹
    const projectPath = process.env.PROJECT_PATH || "vite-react"; // S3_FOLDER 下的项目路径

    if (!apiKey) {
      throw new Error("❌ 错误: 需要设置 SCALEBOX_API_KEY 环境变量");
    }
    if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
      throw new Error(
        "❌ 错误: 需要设置 S3 相关环境变量:\n" +
          "  - S3_ENDPOINT\n" +
          "  - S3_ACCESS_KEY\n" +
          "  - S3_SECRET_KEY\n" +
          "  - S3_BUCKET"
      );
    }

    // 1. 创建带 OSS 挂载的 Scalebox 沙盒
    console.log("📦 正在创建 Scalebox 沙盒并挂载 OSS...");
    const templateName = process.env.TEMPLATE_NAME || "nodejs-24-nvm";
    console.log(`   使用模板: ${templateName}`);
    console.log(`   OSS Bucket: ${s3Bucket}`);
    console.log(`   项目路径: ${s3Folder}/${projectPath}`);
    console.log(`   挂载点: /mnt/oss\n`);

    sandbox = await Sandbox.create(templateName, {
      apiKey: apiKey,
      timeoutMs: 600000, // 10 分钟超时
      metadata: { project: "vite-react-app-oss-mount" },
      envs: { NODE_ENV: "development" },
      objectStorage: {
        uri: `s3://${s3Bucket}/`,
        mountPoint: "/mnt/oss",
        accessKey: s3AccessKey,
        secretKey: s3SecretKey,
        region: s3Region,
        endpoint: s3Endpoint,
      },
    });
    console.log(`✅ 沙盒创建成功，ID: ${sandbox.sandboxId}`);
    console.log(`✅ OSS 已挂载到: /mnt/oss\n`);

    // 2. 等待挂载完成
    console.log("⏳ 等待 OSS 挂载完成...");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待 3 秒

    // 3. 验证环境和挂载
    console.log("🔍 验证环境和 OSS 挂载...");
    const verifyResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && node -v && npm -v && echo "---挂载点---" && ls -la /mnt/ && echo "---OSS根目录---" && ls -la /mnt/oss/ 2>&1 && echo "---查找文件---" && find /mnt/oss -maxdepth 3 -type f 2>&1 | head -20`,
      { timeoutMs: 15000 }
    );
    console.log(`   环境和挂载验证:\n${verifyResult.stdout.trim()}\n`);

    // 3. 验证 OSS 中的项目目录
    const ossProjectDir = `/mnt/oss/${s3Folder}/${projectPath}`;
    console.log(`📂 正在验证 OSS 项目目录: ${ossProjectDir}...`);
    const checkDirResult = await sandbox.commands.run(
      `ls -la ${ossProjectDir}`,
      { timeoutMs: 10000 }
    );
    
    if (checkDirResult.exitCode !== 0) {
      throw new Error(
        `OSS 项目目录不存在或无法访问: ${ossProjectDir}\n` +
        `请确保 OSS 中存在该路径，并且包含 Vite React 项目文件。\n` +
        `错误: ${checkDirResult.stderr}`
      );
    }
    console.log(`✅ OSS 项目目录验证成功\n`);

    // 4. 拷贝文件到本地目录
    const localAppDir = "/tmp/app";
    console.log(`📋 正在从 OSS 拷贝文件到本地: ${localAppDir}...`);
    console.log(`   ⚠️  注意：不能直接在 OSS 挂载路径下安装依赖（只读/性能差）`);
    
    await sandbox.commands.run(`mkdir -p ${localAppDir}`, { timeoutMs: 5000 });
    
    const copyResult = await sandbox.commands.run(
      `cp -r ${ossProjectDir}/* ${localAppDir}/`,
      { timeoutMs: 60000 }
    );
    
    if (copyResult.exitCode !== 0) {
      throw new Error(`文件拷贝失败: ${copyResult.stderr}`);
    }
    console.log(`✅ 文件拷贝完成\n`);

    // 5. 验证拷贝的文件
    console.log("✅ 文件验证:");
    const lsResult = await sandbox.commands.run(
      `ls -lah ${localAppDir}`,
      { timeoutMs: 5000 }
    );
    console.log(lsResult.stdout);

    // 6. 安装项目依赖
    console.log("📥 正在安装项目依赖（这可能需要几分钟）...");
    const installResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && cd ${localAppDir} && npm install`,
      { timeoutMs: 300000 } // 5 分钟超时
    );

    if (installResult.exitCode !== 0) {
      throw new Error(`依赖安装失败: ${installResult.stderr}`);
    }
    console.log("✅ 依赖安装成功\n");

    // 7. 启动前端服务（使用 nohup 后台运行）
    console.log("🚀 正在启动前端服务...");
    
    const startCommand = `sh -c 'cd ${localAppDir} && . "$HOME/.nvm/nvm.sh" && nohup npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/vite-app.log 2>&1 & echo $!'`;
    
    const startResult = await sandbox.commands.run(startCommand, {
      timeoutMs: 60000,
    });

    if (startResult.exitCode !== 0) {
      throw new Error(`服务启动失败: ${startResult.stderr}`);
    }

    const pid = startResult.stdout.trim();
    console.log(`✅ 服务已启动，进程 ID: ${pid}\n`);

    // 8. 等待服务启动
    console.log("⏳ 等待服务启动...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 检查进程是否运行
    const psResult = await sandbox.commands.run(`ps -p ${pid}`, { timeoutMs: 5000 });
    if (psResult.exitCode === 0) {
      console.log(`✅ 进程运行中 (PID: ${pid})\n`);
    } else {
      console.log(`⚠️  无法验证进程状态，请检查日志\n`);
    }

    // 9. 输出访问信息
    const serviceUrl = await sandbox.getHost(3000);
    const sandboxBaseUrl = `https://${sandbox.sandboxDomain}`;

    console.log("============================================================");
    console.log("🎉 部署完成！");
    console.log("============================================================");
    console.log(`📦 沙盒 ID: ${sandbox.sandboxId}`);
    console.log(`🌐 沙盒地址: ${sandboxBaseUrl}`);
    console.log(`🌐 应用访问地址（3000端口）: https://${serviceUrl}`);
    console.log(`📁 OSS 挂载点: /mnt/oss`);
    console.log(`📁 OSS 源目录: ${ossProjectDir}`);
    console.log(`📁 应用目录: ${localAppDir}`);
    console.log(`📝 日志文件: /tmp/vite-app.log`);
    console.log(`🔢 进程 ID: ${pid}`);
    console.log("============================================================\n");

    console.log("💡 提示：");
    console.log("   - OSS 已挂载到沙盒（只读）");
    console.log("   - 服务已通过 nohup 在后台运行");
    console.log("   - 所有输出都重定向到 /tmp/vite-app.log");
    console.log("   - 修改 OSS 文件需重新部署");
    console.log("============================================================\n");

    console.log("📋 常用命令（在沙盒中执行）：");
    console.log(`   # 查看日志`);
    console.log(`   tail -f /tmp/vite-app.log`);
    console.log();
    console.log(`   # 查看进程状态`);
    console.log(`   ps aux | grep ${pid}`);
    console.log();
    console.log(`   # 停止服务`);
    console.log(`   kill ${pid}`);
    console.log();
    console.log(`   # 查看 OSS 挂载内容`);
    console.log(`   ls -la /mnt/oss`);
    console.log();
    console.log(`   # 进入应用目录`);
    console.log(`   cd ${localAppDir}`);
    console.log("============================================================\n");
  } catch (error) {
    console.error("\n❌ 部署失败:");
    console.error((error as Error).message);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error("发生未处理的错误:", error);
  process.exit(1);
});
