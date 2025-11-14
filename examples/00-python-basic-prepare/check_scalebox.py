from dotenv import load_dotenv; load_dotenv()
from scalebox.code_interpreter import Sandbox


sandbox = Sandbox.create()  # Default lifetime: 5 minutes
execution = sandbox.run_code("print('hello world')", language="python")


print("stdout:", execution.logs.stdout)

files = sandbox.files.list("/")
print("files:", files)
