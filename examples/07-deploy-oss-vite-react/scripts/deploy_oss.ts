import { Sandbox } from "@scalebox/sdk";
import { S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFileSync, readdirSync, statSync, existsSync, createReadStream } from "fs";
import { join, dirname, relative, sep, basename } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

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
 * 打包目录为 zip 文件
 */
async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err: Error) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

/**
 * 上传文件到 S3
 */
async function uploadToS3(
  s3Client: S3Client,
  bucket: string,
  key: string,
  filePath: string
): Promise<void> {
  const fileStream = createReadStream(filePath);
  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: fileStream,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
}

/**
 * 主函数：使用 S3 OSS 部署 Vite React 应用到 Scalebox 沙盒
 */
async function main() {
  let sandbox: Sandbox | null = null;

  try {
    console.log("🚀 开始使用 S3 OSS 部署 Vite React 应用到 Scalebox 沙盒...\n");

    // 检查必需的环境变量
    const apiKey = process.env.SCALEBOX_API_KEY;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3Bucket = process.env.S3_BUCKET;
    const s3Region = process.env.S3_REGION || "us-east-1";
    const s3Folder = process.env.S3_FOLDER || "vite-react"; // S3 bucket 中的文件夹名称

    if (!apiKey) {
      throw new Error("❌ 错误: 需要设置 SCALEBOX_API_KEY 环境变量");
    }
    if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
      throw new Error(
        "❌ 错误: 需要设置 S3 相关环境变量:\n" +
          "  - S3_ENDPOINT\n" +
          "  - S3_ACCESS_KEY\n" +
          "  - S3_SECRET_KEY\n" +
          "  - S3_BUCKET\n" +
          "  - S3_REGION (可选，默认 us-east-1)"
      );
    }

    // 1. 配置 S3 客户端
    console.log("🔧 正在配置 S3 客户端...");
    
    // AWS S3 配置：如果使用 s3.amazonaws.com，不指定 endpoint 让 SDK 自动处理区域
    const s3ClientConfig: any = {
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    };
    
    // 只有非 AWS S3 的情况才指定 endpoint (如 MinIO, 阿里云 OSS)
    if (s3Endpoint && !s3Endpoint.includes('s3.amazonaws.com')) {
      s3ClientConfig.endpoint = s3Endpoint;
      s3ClientConfig.forcePathStyle = true; // 适用于 MinIO 等 S3 兼容服务
    }
    
    const s3Client = new S3Client(s3ClientConfig);
    console.log(`✅ S3 客户端配置完成`);
    console.log(`   Region: ${s3Region}`);
    if (s3ClientConfig.endpoint) {
      console.log(`   Endpoint: ${s3Endpoint}`);
    }
    console.log();

    // 验证 S3 连接
    console.log(`🔍 正在验证 S3 Bucket: ${s3Bucket}...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
      console.log(`✅ S3 Bucket 验证成功: ${s3Bucket}\n`);
    } catch (error: any) {
      console.error("\n❌ S3 Bucket 验证失败，详细信息：");
      console.error(`   错误类型: ${error.name || 'Unknown'}`);
      console.error(`   错误消息: ${error.message || 'No message'}`);
      console.error(`   状态码: ${error.$metadata?.httpStatusCode || 'N/A'}`);
      console.error(`   Endpoint: ${s3Endpoint}`);
      console.error(`   Bucket: ${s3Bucket}`);
      console.error(`   Region: ${s3Region}`);
      
      // 提供诊断建议
      console.error("\n💡 可能的原因：");
      if (error.$metadata?.httpStatusCode === 301) {
        console.error("   ⚠️  HTTP 301 重定向错误 - Region 配置问题");
        console.error(`   你的 bucket 在 ${s3Region} region，但 endpoint 配置不匹配`);
        console.error("\n   解决方案：");
        console.error("   方案 1（推荐）：移除或注释掉 S3_ENDPOINT，让 SDK 自动处理");
        console.error("   # S3_ENDPOINT=https://s3.amazonaws.com");
        console.error("\n   方案 2：使用区域特定的 endpoint");
        console.error(`   S3_ENDPOINT=https://s3.${s3Region}.amazonaws.com`);
      } else if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
        console.error("   1. Access Key 或 Secret Key 不正确");
        console.error("   2. IAM 用户权限不足，需要 s3:ListBucket 权限");
      } else if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        console.error("   1. Bucket 不存在");
        console.error("   2. Bucket 名称拼写错误");
        console.error("   3. Region 配置不正确");
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error("   1. Endpoint 地址不正确");
        console.error("   2. 网络连接问题");
        console.error("   3. 防火墙阻止了连接");
      } else {
        console.error("   1. 检查 S3 凭证是否正确");
        console.error("   2. 检查 Bucket 名称和 Region");
        console.error("   3. 检查网络连接");
      }
      
      throw new Error(`S3 Bucket 验证失败: ${error.message || error.name || 'Unknown error'}`);
    }

    // 2. 打包项目文件
    const localProjectDir = join(__dirname, "..", "projects", "vite-react");
    const zipFileName = `vite-react-${Date.now()}.zip`;
    const zipFilePath = join(__dirname, "..", zipFileName);

    console.log("📦 正在打包项目文件...");
    console.log(`   源目录: ${localProjectDir}`);
    console.log(`   目标文件: ${zipFileName}`);

    await zipDirectory(localProjectDir, zipFilePath);
    const stats = statSync(zipFilePath);
    console.log(`✅ 打包完成，文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

    // 3. 上传到 S3
    console.log("☁️  正在上传到 S3...");
    const s3Key = `${s3Folder}/${zipFileName}`;
    console.log(`   目标路径: s3://${s3Bucket}/${s3Key}`);
    await uploadToS3(s3Client, s3Bucket, s3Key, zipFilePath);
    console.log(`✅ 上传成功\n`);

    // 4. 创建 Scalebox 沙盒
    console.log("📦 正在创建 Scalebox 沙盒...");
    const templateName = process.env.TEMPLATE_NAME || "nodejs-24-nvm";
    console.log(`   使用模板: ${templateName}`);

    sandbox = await Sandbox.create(templateName, {
      apiKey: apiKey,
      timeoutMs: 600000, // 10 分钟超时
      metadata: { project: "vite-react-app-oss" },
      envs: { NODE_ENV: "development" },
    });
    console.log(`✅ 沙盒创建成功，ID: ${sandbox.sandboxId}\n`);

    // 5. 验证环境
    console.log("🔍 验证环境...");
    const versionResult = await sandbox.commands.run(
      `. "$HOME/.nvm/nvm.sh" && node -v && npm -v`,
      { timeoutMs: 10000 }
    );
    console.log(`   环境版本:\n${versionResult.stdout.trim()}\n`);

    // 6. 安装必需的工具（wget 和 unzip）
    console.log("🛠️  正在安装必需工具...");
    await sandbox.commands.run("apt update && apt install -y wget unzip", {
      timeoutMs: 120000,
    });
    console.log("✅ 工具安装完成\n");

    const remoteAppDir = "/tmp/app";

    // 7. 生成预签名 URL
    console.log("🔑 正在生成预签名 URL...");
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
    });
    
    // 预签名 URL 有效期 1 小时
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("✅ 预签名 URL 生成成功\n");

    // 8. 从 S3 下载文件到沙盒
    console.log("📥 正在从 S3 下载文件到沙盒...");
    const downloadResult = await sandbox.commands.run(
      `wget -O /tmp/${zipFileName} "${presignedUrl}"`,
      { timeoutMs: 300000 }
    );

    if (downloadResult.exitCode !== 0) {
      throw new Error(`从 S3 下载失败: ${downloadResult.stderr}`);
    }
    console.log("✅ 文件下载完成\n");

    // 9. 解压文件
    console.log("📂 正在解压文件...");
    await sandbox.commands.run(`mkdir -p ${remoteAppDir}`, { timeoutMs: 5000 });
    const unzipResult = await sandbox.commands.run(
      `unzip -o /tmp/${zipFileName} -d ${remoteAppDir}`,
      { timeoutMs: 60000 }
    );

    if (unzipResult.exitCode !== 0) {
      throw new Error(`解压失败: ${unzipResult.stderr}`);
    }
    console.log("✅ 文件解压完成\n");

    // 验证文件
    const verifyResult = await sandbox.commands.run(`ls -la ${remoteAppDir}`, {
      timeoutMs: 10000,
    });
    console.log(`✅ 文件验证:\n${verifyResult.stdout}\n`);

    // 清理下载的 zip 文件
    await sandbox.commands.run(`rm /tmp/${zipFileName}`, { timeoutMs: 5000 });

    // 10. 安装项目依赖
    console.log("📥 正在安装项目依赖（这可能需要几分钟）...");
    const installResult = await sandbox.commands.run(
      `cd ${remoteAppDir} && . "$HOME/.nvm/nvm.sh" && npm install`,
      { timeoutMs: 300000 }
    );

    if (installResult.exitCode !== 0) {
      throw new Error(`依赖安装失败: ${installResult.stderr}`);
    }
    console.log("✅ 依赖安装成功\n");

    // 11. 启动服务（使用 nohup）
    console.log("🚀 正在启动前端服务...");

    const startCommand = `sh -c 'cd ${remoteAppDir} && . "$HOME/.nvm/nvm.sh" && nohup npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/vite-app.log 2>&1 & echo $!'`;

    const startResult = await sandbox.commands.run(startCommand, {
      timeoutMs: 60000,
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

    // 12. 输出访问信息
    const publicUrl = `https://${sandbox.getHost(3000)}`;
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
    console.log(`☁️  S3 文件: s3://${s3Bucket}/${s3Key}`);
    console.log("=".repeat(60));
    console.log("\n💡 提示：");
    console.log("   - 服务已通过 nohup 在后台运行");
    console.log("   - 所有输出都重定向到 /tmp/vite-app.log");
    console.log("   - 项目文件已从 S3 OSS 下载并部署");
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

