from dotenv import load_dotenv
import os
from scalebox.code_interpreter import Sandbox


def main() -> None:
    """在 scalebox 中执行 Hello World 代码，保存文件并查看输出"""
    # 加载环境变量
    load_dotenv()

    # 检查 API key
    api_key = os.getenv('SBX_API_KEY')
    if not api_key:
        print("错误: 需要设置 SBX_API_KEY 环境变量")
        print("请访问 https://dev/dashboard 的 Team 标签页获取 API key")
        print("然后设置环境变量: export SBX_API_KEY='sbx_...'")
        return

    # 创建沙箱
    try:
        sandbox = Sandbox.create()
        print(f"沙箱 ID: {sandbox.sandbox_id}")
    except Exception as e:
        print(f"创建沙箱失败: {e}")
        return

    # 执行 Hello World 代码
    print("\n=== 执行 Hello World 代码 ===")
    execution = sandbox.run_code("print('Hello, World!')", language="python")
    print(f"标准输出: {execution.logs.stdout}")
    print(f"标准错误: {execution.logs.stderr}")
    print(f"返回码: {execution.return_code}")

    # 将代码保存到文件
    print("\n=== 保存代码到文件 ===")
    sandbox.files.write("hello_world.py", "print('Hello, World!')")
    print("文件已保存: hello_world.py")

    # 列出文件确认
    print("\n=== 列出沙箱文件 ===")
    files = sandbox.files.list("/")
    for file in files:
        print(f"  - {file.path}")

    # 读取保存的文件内容
    print("\n=== 读取保存的文件内容 ===")
    file_content = sandbox.files.read("hello_world.py")
    print(f"文件内容:\n{file_content}")

    # 执行保存的文件
    print("\n=== 执行保存的文件 ===")
    execution2 = sandbox.run_code("exec(open('hello_world.py').read())", language="python")
    print(f"标准输出: {execution2.logs.stdout}")
    print(f"标准错误: {execution2.logs.stderr}")


if __name__ == "__main__":
    main()

