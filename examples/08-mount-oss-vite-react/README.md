# 08 - 通过挂载 OSS 部署 Vite React 应用

使用 Scalebox 的对象存储挂载功能（objectStorage），将 S3/OSS bucket 直接挂载到沙盒，无需下载文件即可运行 Vite React 应用。

## 🌟 特点

- ✅ 直接挂载 OSS bucket 到沙盒（使用 `objectStorage` API）
- ✅ 无需下载文件，节省部署时间
- ✅ 支持大型项目和多文件场景
- ✅ 适合需要直接访问 OSS 数据的应用
- ✅ 包含上传脚本，方便将本地项目上传到 OSS

## 📋 前置条件

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
PROJECT_PATH=vite-react  # OSS 中的项目路径

# AWS S3 无需设置 S3_ENDPOINT
# 其他服务（MinIO/OSS）需要设置，见下方配置示例
```

### 3. 上传项目到 OSS（首次部署）

如果 OSS 中还没有项目文件，需要先上传：

```bash
pnpm run upload
```

这会将 `../07-deploy-oss-vite-react/projects/vite-react` 项目上传到 OSS 的 `frontend/vite-react` 目录。

### 4. 运行部署

```bash
pnpm run deploy
```

脚本会：
1. 创建沙盒并挂载 OSS bucket 到 `/mnt/oss`
2. 验证 OSS 项目目录 `/mnt/oss/frontend/vite-react`
3. **拷贝文件到本地** `/tmp/app`（重要：不能直接在 OSS 路径安装依赖）
4. 在本地目录安装依赖
5. 启动 Vite 开发服务器

## 📂 项目结构

```
08-mount-oss-vite-react/
├── scripts/
│   ├── upload_oss.ts         # 上传项目到 OSS 的脚本
│   └── mount_oss.ts          # OSS 挂载部署脚本
├── .env                      # 环境变量配置（需创建）
├── .env.example              # 环境变量示例
├── .gitignore                # Git 忽略文件
├── package.json
└── README.md
```

**注意：** 本示例不包含 `projects/` 目录，项目文件从 `../07-deploy-oss-vite-react/projects/vite-react` 上传。


## 🔧 部署流程

脚本会自动完成以下步骤：

1. **创建沙盒并挂载 OSS** - 使用 `objectStorage` API 挂载 OSS bucket 到 `/mnt/oss`
2. **验证环境** - 检查 Node.js、npm 版本和 OSS 挂载
3. **验证 OSS 项目** - 检查 OSS 中的项目目录是否存在
4. **拷贝到本地** - 从 `/mnt/oss/frontend/vite-react` 拷贝到 `/tmp/app`
5. **安装依赖** - 在本地目录运行 `npm install`
6. **启动服务** - 使用 nohup 启动 Vite 开发服务器

**⚠️ 重要说明：**
- OSS 挂载是只读或 I/O 性能差，不适合直接安装依赖
- 必须先拷贝文件到本地目录（`/tmp/app`）
- 然后在本地目录安装依赖和运行应用

## ⚙️ 配置说明

### 环境变量详解

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `SCALEBOX_API_KEY` | Scalebox API 密钥 | ✅ | - |
| `S3_ENDPOINT` | S3 服务端点 | ✅ | - |
| `S3_ACCESS_KEY` | S3 访问密钥 | ✅ | - |
| `S3_SECRET_KEY` | S3 密钥 | ✅ | - |
| `S3_BUCKET` | S3 bucket 名称 | ✅ | - |
| `S3_REGION` | S3 区域 | ❌ | `us-east-1` |
| `S3_FOLDER` | bucket 中的文件夹名称 | ❌ | `frontend` |
| `PROJECT_PATH` | S3_FOLDER 下的项目路径 | ❌ | `vite-react` |
| `TEMPLATE_NAME` | Scalebox 模板名称 | ❌ | `nodejs-24-nvm` |

**路径说明：**
- `S3_FOLDER`：OSS bucket 中的一级目录（如 `frontend`）
- `PROJECT_PATH`：`S3_FOLDER` 下的项目目录（如 `vite-react`）
- 完整路径：`/mnt/oss/{S3_FOLDER}/{PROJECT_PATH}/`
- 示例：`/mnt/oss/frontend/vite-react/`

**objectStorage API：**

脚本使用 Scalebox 的 `objectStorage` API 进行挂载：

```typescript
objectStorage: {
  uri: `s3://${s3Bucket}/`,
  mountPoint: "/mnt/oss",
  accessKey: s3AccessKey,
  secretKey: s3SecretKey,
  region: s3Region,
  endpoint: s3Endpoint,
}
```

- 整个 bucket 挂载到沙盒的 `/mnt/oss` 目录
- 无需下载文件，直接访问 OSS 中的内容
- 挂载是只读的，不支持在沙盒中修改 OSS 文件

### S3 / OSS 配置示例

**AWS S3：**
```bash
# 无需设置 S3_ENDPOINT
S3_REGION=us-east-2  # bucket 所在的实际 region
PROJECT_PATH=vite-react
```

**MinIO：**
```bash
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
PROJECT_PATH=vite-react
```

**阿里云 OSS：**
```bash
S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
S3_REGION=oss-cn-hangzhou
PROJECT_PATH=vite-react
```

**腾讯云 COS：**
```bash
S3_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
S3_REGION=ap-guangzhou
PROJECT_PATH=vite-react
```

## 📝 使用说明

### 访问应用

部署成功后，脚本会输出完整信息：

```
============================================================
🎉 部署完成！
============================================================
📦 沙盒 ID: sbx-xxx
🌐 沙盒地址: sbx-xxx.region.scalebox.dev
🌐 应用访问地址（3000端口）: https://3000-sbx-xxx.region.scalebox.dev
📁 OSS 挂载点: /mnt/oss
📁 项目目录: /mnt/oss/vite-react
📝 日志文件: /tmp/vite-app.log
🔢 进程 ID: 2514
============================================================
```

直接访问应用访问地址即可使用部署的 Vite React 应用。

### 查看服务状态

部署完成后，可以使用以下命令管理服务：

```bash
# 查看实时日志
tail -f /tmp/vite-app.log

# 查看完整日志
cat /tmp/vite-app.log

# 查看进程状态（将 PID 替换为实际进程 ID）
ps aux | grep <PID>

# 停止服务
kill <PID>

# 查看 OSS 挂载内容
ls -la /mnt/oss

# 进入项目目录
cd /mnt/oss/vite-react
```

## 💡 优势对比

### vs 07 OSS 下载方式

| 特性 | OSS 下载（07） | OSS 挂载（08） |
|------|---------------|---------------|
| 部署方式 | 预签名 URL 下载 zip | 挂载后拷贝文件 |
| 代码获取 | 下载并解压 | OSS 挂载 + 本地拷贝 |
| 存储占用 | 沙盒本地存储 | 沙盒本地存储 |
| 适用场景 | 代码部署 | 访问 OSS 数据 |
| OSS 依赖 | 仅部署时 | 持续连接 |
| 复杂度 | 简单 | 较复杂 |

### 何时使用 OSS 挂载方案？

✅ **推荐使用：**
- 需要从 OSS 读取大量文件的场景
- 多个沙盒需要访问同一 OSS 数据
- 应用运行时需要读取 OSS 中的数据文件
- 不需要频繁写入的场景

❌ **不推荐使用：**
- 简单的代码部署（推荐使用 07 方式）
- 需要频繁写入文件的场景
- 生产环境的代码部署

**对比 07 方式：**
- 07 方式（预签名 URL 下载）：更简单直接，适合代码部署
- 08 方式（OSS 挂载）：适合需要访问 OSS 中大量数据的场景

## 🔍 故障排查

### 常见问题

**1. OSS 挂载失败或目录为空**

检查以下几点：
- 确认 bucket 名称、region 和 endpoint 配置正确
- 确认 Access Key 和 Secret Key 有效
- AWS S3：无需设置 `S3_ENDPOINT`（或留空）
- 非 AWS S3：必须设置正确的 endpoint

验证 OSS 挂载：
```bash
# 部署时脚本会输出挂载验证信息
# 查看 /mnt/oss 目录内容
```

**2. 项目目录不存在**

确保已经上传项目到 OSS：
```bash
# 运行上传脚本
pnpm run upload

# 或使用 AWS CLI 检查
aws s3 ls s3://your-bucket/frontend/vite-react/
```

**3. 文件拷贝失败**

确保有足够的权限和空间：
```bash
# 检查磁盘空间
df -h /tmp

# 检查 OSS 文件权限
ls -la /mnt/oss/frontend/vite-react
```

**4. 依赖安装失败**

已经拷贝到本地，安装速度正常。如果失败：
- 检查 `/tmp/app` 目录权限
- 查看完整错误日志

**5. S3 权限问题**

需要以下 S3 权限：
- `s3:ListBucket` - 列出 bucket 内容
- `s3:GetObject` - 读取文件
- `s3:PutObject` - 上传文件（仅上传脚本需要）

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
    "Resource": [
      "arn:aws:s3:::your-bucket-name",
      "arn:aws:s3:::your-bucket-name/*"
    ]
  }]
}
```

## 📚 相关示例

- `../05-create-nodejs-template` - 创建 Node.js 模板
- `../06-deploy-vite-react` - 直接上传部署
- `../07-deploy-oss-vite-react` - OSS 下载部署

