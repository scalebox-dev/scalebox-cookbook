import { Sandbox } from "@scalebox/sdk";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// 加载 .env 文件
config();

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 递归读取目录中的所有文件（排除系统文件）
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    // 跳过系统文件和 node_modules
    if (file === ".DS_Store" || file.startsWith(".") || file === "node_modules") {
      return;
    }

    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * 将本地文件夹上传到沙盒（使用 SDK 的 uploadFile 方法）
 */
async function uploadDirectoryToSandbox(
  sandbox: Sandbox,
  localDir: string,
  remoteDir: string
): Promise<void> {
  console.log(`📤 正在上传文件夹 ${localDir} 到沙盒 ${remoteDir}...`);

  // 检查本地目录是否存在
  if (!existsSync(localDir)) {
    throw new Error(`本地目录不存在: ${localDir}`);
  }

  // 获取所有文件
  const allFiles = getAllFiles(localDir);
  const basePath = localDir.endsWith(sep) ? localDir.slice(0, -1) : localDir;

  console.log(`   找到 ${allFiles.length} 个文件需要上传...`);

  // 在沙盒中创建目标目录
  await sandbox.commands.run(`mkdir -p ${remoteDir}`, {
    timeoutMs: 5000,
  });

  // 使用 SDK 的 uploadFile 方法逐个上传文件
  for (let i = 0; i < allFiles.length; i++) {
    const localFilePath = allFiles[i];
    const relativePath = relative(basePath, localFilePath);
    const remoteFilePath = join(remoteDir, relativePath).replace(/\\/g, "/");

    // 创建远程目录（如果需要）
    const remoteFileDir = dirname(remoteFilePath);
    await sandbox.commands.run(`mkdir -p ${remoteFileDir}`, {
      timeoutMs: 5000,
    });

    // 使用 SDK 的 uploadFile 方法上传文件
    await sandbox.uploadFile(localFilePath, remoteFilePath);

    // 显示进度
    if ((i + 1) % 10 === 0 || i === allFiles.length - 1) {
      console.log(`   已上传 ${i + 1}/${allFiles.length} 个文件...`);
    }
  }

  console.log(`✅ 文件夹上传完成\n`);
}

/**
 * 主函数：部署 Vite React 应用到 Scalebox 沙盒
 */
async function main() {
  let sandbox: Sandbox | null = null;

  try {
    console.log("🚀 开始部署 Vite React 应用到 Scalebox 沙盒...\n");

    // 检查 API Key
    const apiKey = process.env.SCALEBOX_API_KEY;
    if (!apiKey) {
      throw new Error(
        "❌ 错误: 需要设置 SCALEBOX_API_KEY 环境变量\n" +
          "请在项目根目录创建 .env 文件并添加: SCALEBOX_API_KEY=your_api_key"
      );
    }

    // 1. 创建 Scalebox 沙盒
    console.log("📦 正在创建 Scalebox 沙盒...");
    // 使用之前创建的 nodejs-24-nvm 模板
    const templateName = process.env.TEMPLATE_NAME || "nodejs-24-nvm";
    console.log(`   使用模板: ${templateName}`);
    
    sandbox = await Sandbox.create(templateName, {
      apiKey: apiKey,
      timeoutMs: 600000, // 10 分钟超时
      metadata: { project: "vite-react-app" },
      envs: { NODE_ENV: "development" }, // 开发模式
    });
    console.log(`✅ 沙盒创建成功，ID: ${sandbox.sandboxId}\n`);

    // 2. 验证环境 (可选)
    console.log("🔍 验证环境...");
    const versionResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && node -v && npm -v`,
      { timeoutMs: 10000 }
    );
    console.log(`   环境版本:\n${versionResult.stdout.trim()}\n`);

    // 3. 上传 projects/vite-react 文件夹到沙盒
    const localProjectDir = join(__dirname, "..", "projects", "vite-react");
    const remoteAppDir = "/tmp/app";

    // 先清理目标目录（如果存在）
    await sandbox.commands.run(`rm -rf ${remoteAppDir}`, {
      timeoutMs: 10000,
    });

    // 上传文件夹
    await uploadDirectoryToSandbox(sandbox, localProjectDir, remoteAppDir);

    // 验证文件是否上传成功
    const verifyResult = await sandbox.commands.run(`ls -la ${remoteAppDir}`, {
      timeoutMs: 10000,
    });
    console.log(`✅ 文件上传验证:\n${verifyResult.stdout}\n`);

    // 4. 安装项目依赖
    console.log("📥 正在安装项目依赖（这可能需要几分钟）...");
    const installResult = await sandbox.commands.run(
      `cd ${remoteAppDir} && . "$HOME/.nvm/nvm.sh" && npm install`,
      { timeoutMs: 300000 } // 5 分钟超时用于安装依赖
    );

    if (installResult.exitCode !== 0) {
      throw new Error(`依赖安装失败: ${installResult.stderr}`);
    }
    console.log("✅ 依赖安装成功\n");

    // 5. 启动服务（使用 nohup）
    console.log("🚀 正在启动前端服务...");

    // 使用 sh -c 启动后台进程，立即返回 PID
    const startCommand = `sh -c 'cd ${remoteAppDir} && . "$HOME/.nvm/nvm.sh" && nohup npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/vite-app.log 2>&1 & echo $!'`;

    const startResult = await sandbox.commands.run(startCommand, {
      timeoutMs: 60000, // 增加到 60 秒
    });

    if (startResult.exitCode !== 0) {
      throw new Error(`服务启动失败: ${startResult.stderr}`);
    }

    const pid = startResult.stdout.trim();
    console.log(`✅ 服务已启动，进程 ID: ${pid}\n`);

    // 等待几秒确保服务启动
    console.log("⏳ 等待服务启动...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 检查进程是否在运行
    const processCheckResult = await sandbox.commands.run(
      `ps aux | grep -v grep | grep ${pid} || echo "进程未找到"`,
      { timeoutMs: 5000 }
    );
    
    if (processCheckResult.stdout.includes("进程未找到")) {
      console.warn("⚠️  警告：进程可能已退出，请检查日志");
    } else {
      console.log(`✅ 进程运行中 (PID: ${pid})\n`);
    }

    // 6. 输出访问信息
    const publicUrl = `https://${sandbox.getHost(3000)}`;
    // sandboxDomain 已经包含了完整的域名
    const sandboxBaseUrl = sandbox.sandboxDomain;
    
    console.log("=".repeat(60));
    console.log("🎉 部署完成！");
    console.log("=".repeat(60));
    console.log(`📦 沙盒 ID: ${sandbox.sandboxId}`);
    console.log(`🌐 沙盒地址: ${sandboxBaseUrl}`);
    console.log(`🌐 应用访问地址（3000端口）: ${publicUrl}`);
    console.log(`📁 应用目录: ${remoteAppDir}`);
    console.log(`📝 日志文件: /tmp/vite-app.log`);
    console.log(`🔢 进程 ID: ${pid}`);
    console.log("=".repeat(60));
    console.log("\n💡 提示：");
    console.log("   - 服务已通过 nohup 在后台运行");
    console.log("   - 所有输出都重定向到 /tmp/vite-app.log");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ 部署失败:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error("未处理的错误:", error);
  process.exit(1);
});
