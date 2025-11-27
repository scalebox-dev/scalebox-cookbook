# 部署 Vite React 应用到 Scalebox 沙盒

自动化部署 Vite React 前端项目到 Scalebox 沙盒环境，使用预配置的 Node.js 模板和 pm2 进程管理。

## 快速开始

### 1. 前置条件

确保已创建 `nodejs-24-nvm` 模板（参考 `../05-create-nodejs-template`）。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并填写 API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
SCALEBOX_API_KEY="sk-your-api-key"
SCALEBOX_API_URL=https://api.scalebox.dev  # 可选
```

### 4. 运行部署脚本

```bash
pnpm run deploy
```

## 部署流程

脚本会自动完成以下步骤：

1. **创建沙盒** - 使用 `nodejs-24-nvm` 模板创建沙盒（包含 Node.js 24 + nvm 环境）
2. **验证环境** - 检查 Node.js 和 npm 版本
3. **上传项目文件** - 上传 `projects/vite-react` 目录到沙盒的 `/tmp/app`（自动排除 node_modules）
4. **安装依赖** - 在沙盒中运行 `npm install`
5. **启动服务** - 使用 nohup 启动 Vite 开发服务器，监听 3000 端口
6. **验证服务** - 检查进程状态和端口监听情况

## 项目配置

### 端口配置

- **3000** - Vite 开发服务器端口

### 目录结构

```
06-deploy-vite-react/
├── scripts/
│   └── deploy.ts          # 部署脚本
├── projects/
│   └── vite-react/        # Vite React 项目源码
├── .env                   # 环境变量配置
└── README.md
```

## 使用说明

### 管理服务

部署完成后，脚本会输出进程 ID (PID)。你可以使用以下命令管理服务：

```bash
# 查看实时日志（部署时会显示进程 ID）
tail -f /tmp/vite-app.log

# 查看完整日志
cat /tmp/vite-app.log

# 查看进程状态（将 PID 替换为实际进程 ID）
ps aux | grep <PID>

# 停止服务（将 PID 替换为实际进程 ID）
kill <PID>

# 查找所有 Vite 相关进程
ps aux | grep vite

# 检查端口 3000 是否在监听
netstat -tlnp | grep :3000
# 或
ss -tlnp | grep :3000

# 强制停止所有 node 进程（谨慎使用）
pkill -f "npm run dev"
```

### 访问应用

部署成功后，脚本会输出应用访问地址，格式如下：

```
🌐 沙盒地址: sbx-xxx.region.scalebox.dev
🌐 应用访问地址（3000端口）: https://3000-sbx-xxx.region.scalebox.dev
```

直接在浏览器中打开应用访问地址即可。

## 注意事项

### ⚠️ 必须配置 vite.config.ts

**非常重要**：为了让应用能够通过 Scalebox 公网地址访问，必须在 `vite.config.ts` 中配置 `allowedHosts`：

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    // 以点开头的通配符格式，匹配所有 *.scalebox.dev 域名
    allowedHosts: ["localhost", ".local", "0.0.0.0", ".scalebox.dev"],
  },
});
```

**说明：**
- Vite 默认会检查 HTTP Host header，防止 DNS 重绑定攻击
- Scalebox 的访问地址格式为 `3000-sbx-xxx.xxx.scalebox.dev`，需要添加到白名单
- 使用 `.scalebox.dev`（以点开头）可以匹配所有 Scalebox 子域名
- 如果不配置，访问时会看到 "Invalid Host header" 错误

### 进程管理说明

**使用 nohup 后台运行：**
- 服务通过 `nohup` 命令在后台运行
- 所有输出（stdout 和 stderr）都重定向到 `/tmp/vite-app.log`
- 进程 ID (PID) 会在部署完成时显示，用于后续管理

**重启服务：**

如果需要重启服务，按以下步骤操作：

```bash
# 1. 查找并停止现有进程
ps aux | grep "npm run dev" | grep -v grep | awk '{print $2}' | xargs kill

# 2. 重新启动服务
cd /tmp/app
. "$HOME/.nvm/nvm.sh"
nohup npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/vite-app.log 2>&1 & echo $!
```

### 其他注意事项

- **模板依赖**：确保 `nodejs-24-nvm` 模板已创建（参考 `../05-create-nodejs-template`）
- **文件过滤**：上传时自动排除 `node_modules`、`.DS_Store` 和以 `.` 开头的隐藏文件
- **端口配置**：Vite 启动时使用 `--host 0.0.0.0 --port 3000` 允许外部访问
- **进程管理**：服务使用 nohup 在后台运行，日志输出到 `/tmp/vite-app.log`
- **部署目录**：项目文件上传到沙盒的 `/tmp/app` 目录

## 部署输出示例

```
🚀 开始部署 Vite React 应用到 Scalebox 沙盒...

📦 正在创建 Scalebox 沙盒...
   使用模板: nodejs-24-nvm
✅ 沙盒创建成功，ID: sbx-xxx

🔍 验证环境...
   环境版本:
v24.11.1
11.6.2

📤 正在上传文件夹...
   找到 16 个文件需要上传...
   已上传 16/16 个文件...
✅ 文件夹上传完成

📥 正在安装项目依赖（这可能需要几分钟）...
✅ 依赖安装成功

🚀 正在启动前端服务...
✅ 服务已启动，进程 ID: 5632

⏳ 等待服务启动...
✅ 进程运行中 (PID: 5632)

✅ 端口 3000 正在监听

============================================================
🎉 部署完成！
============================================================
📦 沙盒 ID: sbx-xxx
🌐 沙盒地址: sbx-xxx.region.scalebox.dev
🌐 应用访问地址（3000端口）: https://3000-sbx-xxx.region.scalebox.dev
📁 应用目录: /tmp/app
📝 日志文件: /tmp/vite-app.log
🔢 进程 ID: 5632
============================================================

💡 提示：
   - 服务已通过 nohup 在后台运行
   - 所有输出都重定向到 /tmp/vite-app.log

   查看服务日志：
   tail -f /tmp/vite-app.log

   停止服务：
   kill 5632
============================================================
```
