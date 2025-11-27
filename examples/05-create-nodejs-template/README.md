# 创建 Node.js 模板

自动化创建包含 Node.js 24 + nvm 环境的 Scalebox 模板。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写 API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
SCALEBOX_API_KEY="sk-your-api-key"
SCALEBOX_API_URL=https://api.scalebox.dev  # 可选

# 模板配置（可选）
TEMPLATE_NAME="nodejs-24-nvm"              # 模板名称
TEMPLATE_DESCRIPTION=""                     # 模板描述，留空则自动生成
```

### 3. 运行脚本

```bash
pnpm run create
```

## 脚本执行流程

脚本会自动完成以下步骤：

1. **创建 Scalebox 沙盒** - 基于 base 镜像
2. **更新 apt 包列表** - `apt update`
3. **安装 nvm** - Node Version Manager
4. **配置 .bash_profile** - 设置 nvm 环境
5. **安装 Node.js 24** - 使用 nvm 安装
6. **验证安装** - 检查 Node.js 和 npm 版本
7. **创建模板** - 自动将沙盒保存为模板

## 模板配置

创建的模板包含以下端口配置：

- **5173** - vite 开发服务器
- **3000** - 前端服务
- **8000** - 后端服务

## 手动创建步骤（参考）

如果需要手动创建，可以参考以下命令：

```bash
# 更新 apt
apt update

# 安装 nvm (参考 https://nodejs.org/en/download)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# 将 nvm 写入 .bash_profile
echo '. "$HOME/.nvm/nvm.sh"' > .bash_profile

# 安装 Node.js 24
nvm install 24

# 验证版本
node -v # Should print "v24.x.x"
npm -v  # Should print "11.x.x"
```

