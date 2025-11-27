# 07 - 使用 S3 OSS 部署 Vite React 应用

使用 S3 对象存储作为文件传输中介，部署 Vite React 应用到 Scalebox 沙盒。

## 🎯 特点

- ✅ 支持 AWS S3、MinIO、阿里云 OSS 等 S3 兼容服务
- ✅ 自动打包并上传到 S3
- ✅ 使用预签名 URL 安全下载，无需暴露凭证
- ✅ 适合大型项目和网络不稳定场景

## 🔧 前置条件

1. **Scalebox API Key** - 从 Scalebox 控制台获取
2. **S3 账号** - AWS S3 / MinIO / 阿里云 OSS / 腾讯云 COS 等
3. **Node.js 模板** - `nodejs-24-nvm` 模板（参考 `../05-create-nodejs-template`）

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# Scalebox API 配置
SCALEBOX_API_KEY=your_scalebox_api_key_here

# S3 配置（AWS S3 示例）
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-2  # bucket 所在的 region
S3_FOLDER=vite-react  # bucket 中的文件夹路径

# AWS S3 无需设置 S3_ENDPOINT
# 其他服务（MinIO/OSS）需要设置，见下方配置示例
```

### 3. 运行部署

```bash
pnpm run deploy
```

## 📁 项目结构

```
07-deploy-oss-vite-react/
├── scripts/
│   └── deploy_oss.ts      # S3 OSS 部署脚本
├── projects/
│   └── vite-react/        # Vite React 项目源码
├── .env                   # 环境变量配置（需创建）
├── .env.example           # 环境变量示例
├── package.json
└── README.md
```

## 🔄 部署流程

脚本会自动完成以下步骤：

1. **配置 S3 客户端** - 连接到 S3/OSS 服务并验证
2. **打包项目** - 将 `projects/vite-react` 打包为 zip 文件
3. **上传到 S3** - 上传 zip 文件到 S3 bucket
4. **创建沙盒** - 使用 `nodejs-24-nvm` 模板创建沙盒
5. **验证环境** - 检查 Node.js 和 npm 版本
6. **安装工具** - 在沙盒中安装 wget 和 unzip
7. **生成预签名 URL** - 生成临时访问链接（1 小时有效期限）
8. **下载文件** - 使用预签名 URL 下载 zip 文件到沙盒
9. **解压文件** - 解压到 `/tmp/app` 目录
10. **安装依赖** - 运行 `npm install`
11. **启动服务** - 使用 nohup 启动 Vite 开发服务器

## ⚙️ 配置说明

### 环境变量详解

| 变量名             | 说明                  | 必需 | 默认值          |
| ------------------ | --------------------- | ---- | --------------- |
| `SCALEBOX_API_KEY` | Scalebox API 密钥     | ✅   | -               |
| `S3_ENDPOINT`      | S3 服务端点           | ⚠️   | -               |
| `S3_ACCESS_KEY`    | S3 访问密钥           | ✅   | -               |
| `S3_SECRET_KEY`    | S3 密钥               | ✅   | -               |
| `S3_BUCKET`        | S3 bucket 名称        | ✅   | -               |
| `S3_REGION`        | S3 区域               | ⚪   | `us-east-1`     |
| `S3_FOLDER`        | bucket 中的文件夹名称 | ⚪   | `vite-react`    |
| `TEMPLATE_NAME`    | Scalebox 模板名称     | ⚪   | `nodejs-24-nvm` |

**S3_FOLDER 说明：**

- 文件会上传到 `s3://bucket-name/S3_FOLDER/vite-react-timestamp.zip`
- 可以为不同项目设置不同的文件夹，便于管理
- 例如：`vite-react`、`my-project`、`production-app` 等

**下载方式：**

脚本使用**预签名 URL** 技术下载文件：

- 自动生成临时访问链接（1 小时有效期限）
- 沙盒使用临时链接下载文件
- 无需暴露 S3 凭证到沙盒，更安全
- 无需安装 AWS CLI，部署更快

### S3 / OSS 配置示例

**AWS S3：**

```bash
# 无需设置 S3_ENDPOINT
S3_REGION=us-east-2  # bucket 所在的实际 region
```

**MinIO：**

```bash
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
```

**阿里云 OSS：**

```bash
S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
S3_REGION=oss-cn-hangzhou
```

**腾讯云 COS：**

```bash
S3_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
S3_REGION=ap-guangzhou
```

### Vite 配置

确保 `projects/vite-react/vite.config.ts` 中配置了 `allowedHosts`：

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["localhost", ".local", "0.0.0.0", ".scalebox.dev"],
  },
});
```

## 📖 使用说明

### 查看服务状态

部署完成后，脚本会输出沙盒 ID。你可以使用以下命令管理服务：

```bash
# 查看实时日志
tail -f /tmp/vite-app.log

# 查看完整日志
cat /tmp/vite-app.log

# 查看进程状态（将 PID 替换为实际进程 ID）
ps aux | grep <PID>

# 停止服务
kill <PID>

# 查找 Vite 相关进程
ps aux | grep vite

# 检查端口 3000
netstat -tlnp | grep :3000
```

### 访问应用

部署成功后，脚本会输出完整信息：

```
============================================================
🎉 部署完成！
============================================================
📦 沙盒 ID: sbx-bnlkdulcd6yfziu9f
🌐 沙盒地址: sbx-bnlkdulcd6yfziu9f.x6rfrvvjiau6per75.scalebox.dev
🌐 应用访问地址（3000端口）: https://3000-sbx-bnlkdulcd6yfziu9f.x6rfrvvjiau6per75.scalebox.dev
📁 应用目录: /tmp/app
📋 日志文件: /tmp/vite-app.log
🔢 进程 ID: 2514
📦  S3 文件: s3://scalebox-temp-test/frontend/vite-react-1764232985210.zip
============================================================
```

直接访问应用访问地址即可使用部署的 Vite React 应用。

## 📊 优势对比

### vs 直接上传：06-deploy-vite-react

| 特性     | 直接上传       | S3 OSS              |
| -------- | -------------- | ------------------- |
| 适用场景 | 小型项目       | 大型项目            |
| 网络要求 | 稳定           | 宽带                |
| 上传速度 | 受限于本地带宽 | 可利用 S3 加速      |
| 可重用性 | 低             | 高（文件保存在 S3） |
| 成本     | 无需额外成本   | S3 存储+流量费用    |

### 何时使用 S3 OSS 方式？

✅ **推荐使用：**

- 项目文件较大（> 100MB）
- 网络不稳定，直接上传容易失败
- 需要多次部署相同版本
- 团队多人共享部署包
- 使用 CI/CD 自动部署

⚪ **不推荐使用：**

- 快速原型开发
- 小型项目（< 10MB）
- 没有 S3 账号或不想额外成本

## 🔍 故障排查

### S3 权限问题

脚本需要以下 S3 权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### 常见问题

**1. S3 Bucket 验证失败**

- 检查 bucket 名称和 region 是否正确
- 确认 Access Key 和 Secret Key 有效
- AWS S3：无需设置 `S3_ENDPOINT`，会自动根据 region 选择

**2. 下载失败：403 Forbidden**

脚本使用预签名 URL 下载，通常不会遇到权限问题。如果出现：

- 确保 IAM 用户有 `s3:GetObject` 权限
- 检查 bucket 策略没有明确拒绝访问的规则

**3. 本地文件清理**

```bash
# 删除本地生成的 zip 文件
rm vite-react-*.zip
```

## 🔗 相关示例

- `../05-create-nodejs-template` - 创建 Node.js 模板
- `../06-deploy-vite-react` - 直接上传部署（不使用 OSS）

## 📄 License

ISC
