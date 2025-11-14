from dotenv import load_dotenv
from scalebox.code_interpreter import Sandbox


def main() -> None:
    """创建一个 scalebox（Sandbox），执行一段示例代码并列出沙箱文件。"""
    # 加载环境变量（如需要使用鉴权或代理等）
    load_dotenv()

    # 创建沙箱，默认生命周期约 5 分钟
    sandbox = Sandbox.create()
    print("sandbox_id:", sandbox.sandbox_id)

    # 在沙箱内执行一段 Python 代码
    execution = sandbox.run_code("print('hello from scalebox')", language="python")
    print("stdout:", execution.logs.stdout)

    # 列出沙箱根目录文件
    files = sandbox.files.list("/")
    print("files:", files)


if __name__ == "__main__":
    main()









