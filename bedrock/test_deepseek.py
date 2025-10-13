import os
import boto3

# If you already set the API key as an environment variable, you can comment this line out
os.environ['AWS_BEARER_TOKEN_BEDROCK'] = "ABSKQmVkcm9ja0FQSUtleS0zMzdpLWF0LTc2NzM5Nzk1NjcwMjpDZDVNamVyZ3crQThpOFA0M05FUHRhR29SNk50U3ZVUEViWUxDVnVrL0laZ1pEVTZDNTRzcEs3WlEvdz0="

# Create an Amazon Bedrock client
client = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-2"  # If you've configured a default region, you can omit this line
)

# Define the model and message
model_id = "us.deepseek.r1-v1:0"
# messages = [{"role": "user", "content": [{"text": "Hello"}]}]
# messages =[
#     {
#   "role": "user",
#   "content": [{"text":"你是一个代码生成助手。请严格遵守以下输出规则：1. 只输出代码本身，不要任何解释、注释或Markdown代码块(如```python)。2. 保持代码的规范和缩进。"}]
# }
# ]

messages = [
    {"role": "user", "content": [{"text":"用Python写一个Hello World函数。"}]},
    {"role": "assistant", "content": [{"text":"def hello_world():\n    print(\"Hello, World!\")\n\nhello_world()"}]},
    {"role": "user", "content": [{"text":"你是一个代码生成助手。请严格遵守以下输出规则：1. 只输出代码本身，不要任何解释、注释或Markdown代码块(如```python)。2. 保持代码的规范和缩进。 写一个计算斐波那契数列的函数。"}]}
    # 模型会参考上一条assistant的格式进行回复
]
response = client.converse(
    modelId=model_id,
    messages=messages,
)
print(response)
content=response["output"]['message']['content']
for item in content:
    print(item['text'])
# bedrock = boto3.client(service_name='bedrock',region_name="us-east-2")
#
# models=bedrock.list_foundation_models()
#
# print(models)
# for model in models['modelSummaries']:
#     print(model["modelArn"])
