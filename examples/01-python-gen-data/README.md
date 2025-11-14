# AWS Bedrock DeepSeek + Scalebox CSV Data Generator

Generate CSV formatted data using AWS Bedrock's DeepSeek v3 model and store it securely in Scalebox sandbox environment.

[中文文档](./README_zh.md)

## 📋 Project Overview

This example demonstrates how to leverage AI to generate high-quality CSV test data:
- Describe data requirements in natural language
- AI automatically generates CSV data matching the requirements
- Save to Scalebox sandbox environment
- Validate data format and content

## ✨ Core Features

- ✅ **AI-Driven Generation**: Using Bedrock DeepSeek v3 model
- ✅ **Strict Format Control**: Ensures standard CSV output
- ✅ **Diverse Data Types**: Support users, sales, scores, and more
- ✅ **Secure Storage**: Scalebox sandbox environment isolation
- ✅ **Auto Validation**: Data format and content checks
- ✅ **Easy to Reuse**: For testing, analysis, ML, etc.

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                CSV Data Generation Workflow                   │
└─────────────────────────────────────────────────────────────┘

[1] Create Sandbox instance
     ↓
[2] Define data generation task
     - Describe in natural language
     - Specify fields, count, data types
     ↓
[3] Call AWS Bedrock DeepSeek
     - Send generation request
     - Receive AI-generated CSV data
     ↓
[4] Validate and clean data
     - Remove markdown markers
     - Validate CSV format
     ↓
[5] Save to Sandbox
     - Write to file system
     - Verify file size and row count
     ↓
[6] Data statistics
     - Display data preview
     - Output statistics
     ↓
✅ CSV data ready for analysis
```

## 🚀 Quick Start

### Requirements

```bash
pip install boto3 python-dotenv scalebox
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Scalebox API Key
SBX_API_KEY="your_scalebox_api_key"

# AWS Bedrock Configuration
AWS_REGION="eu-north-1"  # Set according to your model region

# Option 1: Use Bearer Token (Recommended for Bedrock)
AWS_BEARER_TOKEN_BEDROCK="your_bearer_token"

# Option 2: Use standard AWS credentials (Optional)
# AWS_ACCESS_KEY_ID="your_aws_access_key"
# AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
```

### Run Example

```bash
python gen_data.py
```

### Customize Data Generation

Edit the `data_tasks` list in `gen_data.py`:

```python
data_tasks = [
    {
        "name": "Student Scores",
        "prompt": "Generate exam scores for 40 students with: student_id, name, chinese, math, english, physics, chemistry, biology",
        "filename": "exam_scores.csv"
    },
    {
        "name": "User Data",
        "prompt": "Generate 100 user records with: user_id, name, age, gender, email, registration_date",
        "filename": "users.csv"
    }
]
```

## 📈 Data Usage

Generated CSV data can be used for:

1. **Application Testing** - Realistic test data
2. **Data Analysis Practice** - Learn pandas, visualization
3. **Machine Learning** - Training/testing datasets
4. **Prototype Development** - Quick demo data generation
5. **Performance Testing** - Bulk data for stress testing


### Download Data from Sandbox

```python
# Read data from Sandbox
csv_content = sandbox.files.read("/tmp/users.csv")

# Save locally
with open("local_users.csv", "w", encoding="utf-8") as f:
    f.write(csv_content)

print("Data downloaded to local_users.csv")
```

## 🏗️ Technical Architecture

```
┌──────────────────┐
│   gen_data.py    │
│  (Python Script) │
└────────┬─────────┘
         │
         ▼
    ┌────────────────────────────────────────┐
    │          AWS Bedrock API               │
    │      DeepSeek v3 Model                 │
    │  - Accept natural language             │
    │  - Generate CSV formatted data         │
    └────────┬───────────────────────────────┘
             │
             ▼
    ┌──────────────────┐
    │   Scalebox       │
    │   Sandbox        │
    │  ├─ File Storage │
    │  ├─ Command Exec │
    │  └─ Isolation    │
    └────────┬─────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │          Output Results                 │
    │  - CSV data files (/tmp/*.csv)         │
    │  - Data validation and statistics      │
    │  - Ready for use or download           │
    └─────────────────────────────────────────┘
```

## 📚 Documentation

For detailed Chinese documentation, see [中文文档](./README_zh.md).

## License

Follow Scalebox and AWS Bedrock terms of service.

## Resources

- [Scalebox Documentation](https://docs.scalebox.dev)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [DeepSeek Model](https://platform.deepseek.com/)
