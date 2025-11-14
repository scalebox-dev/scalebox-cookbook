import os
from dotenv import load_dotenv
from scalebox.code_interpreter import Sandbox


def main() -> None:
    """创建一个 scalebox（Sandbox），并列出根目录下的文件。"""
    # 加载环境变量（如需要使用鉴权或代理等）
    load_dotenv()

    # 检查 API key
    api_key = os.getenv("SBX_API_KEY")
    if not api_key:
        print("错误：需要设置 SBX_API_KEY 环境变量")
        print("请访问 https://dev/dashboard 获取您的 API key")
        print("然后设置环境变量：export SBX_API_KEY='sbx_...'")
        print("或者创建 .env 文件并添加：SBX_API_KEY=sbx_...")
        return

    # 创建沙箱，默认生命周期约 5 分钟
    print("正在创建 scalebox...")
    try:
        sandbox = Sandbox.create()
        print(f"✓ Sandbox 创建成功，ID: {sandbox.sandbox_id}\n")
    except Exception as e:
        print(f"创建 Sandbox 失败: {e}")
        return

    # 列出沙箱根目录文件
    print("沙箱根目录下的文件和目录：")
    print("=" * 50)
    files = sandbox.files.list("/")
    
    # 格式化输出
    for file_info in files:
        if file_info.get("is_dir", False):
            print(f"📁 {file_info.get('name', '')}/")
        else:
            print(f"📄 {file_info.get('name', '')}")
    
    print("=" * 50)
    print(f"总共 {len(files)} 个条目")


if __name__ == "__main__":
    main()

