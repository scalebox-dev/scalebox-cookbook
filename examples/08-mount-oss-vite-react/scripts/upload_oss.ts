import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { readdirSync, statSync, createReadStream } from "fs";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// 加载 .env 文件
config();

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 递归读取目录中的所有文件（排除系统文件和 node_modules）
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    // 跳过系统文件、node_modules 和其他不需要的目录
    if (
      file === ".DS_Store" ||
      file.startsWith(".") ||
      file === "node_modules" ||
      file === "dist" ||
      file === "build"
    ) {
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
 * 上传文件到 S3
 */
async function uploadFileToS3(
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
 * 主函数：上传 Vite React 项目到 OSS
 */
async function main() {
  try {
    console.log("🚀 开始上传 Vite React 项目到 OSS...\n");

    // 检查必需的环境变量
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3Bucket = process.env.S3_BUCKET;
    const s3Region = process.env.S3_REGION || "us-east-1";
    const s3Folder = process.env.S3_FOLDER || "frontend"; // S3 bucket 中的文件夹名称

    if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
      throw new Error(
        "❌ 错误: 需要设置 S3 相关环境变量:\n" +
          "  - S3_ENDPOINT\n" +
          "  - S3_ACCESS_KEY\n" +
          "  - S3_SECRET_KEY\n" +
          "  - S3_BUCKET"
      );
    }

    // 1. 配置 S3 客户端
    console.log("🔧 正在配置 S3 客户端...");
    
    // 判断是否为 AWS S3
    const isAwsS3 = !s3Endpoint || s3Endpoint.includes('s3.amazonaws.com');
    
    const s3Config: any = {
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    };

    // 非 AWS S3 才设置 endpoint
    if (!isAwsS3) {
      s3Config.endpoint = s3Endpoint;
      s3Config.forcePathStyle = true;
    } else {
      // AWS S3 根据 region 自动设置 endpoint
      s3Config.endpoint = `https://s3.${s3Region}.amazonaws.com`;
    }

    const s3Client = new S3Client(s3Config);
    console.log("✅ S3 客户端配置完成");
    console.log(`   Region: ${s3Region}`);
    console.log(`   Endpoint: ${s3Config.endpoint}\n`);

    // 2. 验证 S3 Bucket
    console.log(`🔍 正在验证 S3 Bucket: ${s3Bucket}...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
      console.log(`✅ S3 Bucket 验证成功: ${s3Bucket}\n`);
    } catch (error: any) {
      throw new Error(
        `S3 Bucket 验证失败: ${s3Bucket}\n` +
        `错误: ${error.message}\n` +
        `请检查:\n` +
        `  1. Bucket 名称是否正确\n` +
        `  2. Region 是否匹配\n` +
        `  3. 访问密钥是否有权限`
      );
    }

    // 3. 获取项目目录
    const projectDir = join(__dirname, "../../07-deploy-oss-vite-react/projects/vite-react");
    console.log("📂 正在扫描项目文件...");
    console.log(`   源目录: ${projectDir}`);
    
    const files = getAllFiles(projectDir);
    console.log(`   找到 ${files.length} 个文件\n`);

    // 4. 上传文件到 OSS
    console.log("☁️  正在上传文件到 OSS...");
    console.log(`   目标路径: s3://${s3Bucket}/${s3Folder}/vite-react/\n`);

    let uploadedCount = 0;
    for (const filePath of files) {
      const relativePath = relative(projectDir, filePath);
      const s3Key = `${s3Folder}/vite-react/${relativePath.split(sep).join('/')}`;
      
      try {
        await uploadFileToS3(s3Client, s3Bucket, s3Key, filePath);
        uploadedCount++;
        
        // 每 10 个文件显示一次进度
        if (uploadedCount % 10 === 0) {
          console.log(`   已上传: ${uploadedCount}/${files.length} 文件`);
        }
      } catch (error: any) {
        console.error(`   ❌ 上传失败: ${relativePath}`);
        console.error(`      错误: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n✅ 上传完成！共上传 ${uploadedCount} 个文件\n`);

    console.log("============================================================");
    console.log("🎉 项目已成功上传到 OSS！");
    console.log("============================================================");
    console.log(`☁️  OSS 路径: s3://${s3Bucket}/${s3Folder}/vite-react/`);
    console.log(`📁 上传文件数: ${uploadedCount}`);
    console.log("============================================================\n");

    console.log("💡 下一步：");
    console.log("   1. 确保 .env 中 PROJECT_PATH=vite-react");
    console.log("   2. 确保 .env 中 S3_FOLDER=frontend");
    console.log("   3. 运行 pnpm run deploy 进行挂载部署");
    console.log("============================================================\n");

  } catch (error) {
    console.error("\n❌ 上传失败:");
    console.error((error as Error).message);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error("发生未处理的错误:", error);
  process.exit(1);
});