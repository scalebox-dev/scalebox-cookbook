# CSV Data Intelligent Analysis System

Intelligent data analysis tool based on AWS Bedrock DeepSeek and Scalebox, capable of performing multi-dimensional statistical analysis, generating beautiful visualizations, and producing AI-powered professional analysis reports.

> 💡 **Learning Path**: This example analyzes data generated from [01-python-gen-data](../01-python-gen-data). Recommended to complete that example first.

[中文文档](./README_zh.md)

## 📋 Project Overview

This example demonstrates comprehensive intelligent analysis of CSV data:
- 8+ statistical dimensions (average, max, std deviation, pass rate, etc.)
- 10+ ranking analyses (top per subject, top 3, overall rankings, etc.)
- 5 beautiful visualizations (bar chart, box plot, radar chart, etc.)
- AI-generated professional analysis reports (trend analysis, improvement suggestions)
- Beautiful HTML format reports, viewable directly in browser

## ✨ Core Features

### 📊 Multi-Dimensional Statistical Analysis
- ✅ **Basic Statistics**: Auto-calculate average, max, min, std deviation
- ✅ **Pass Rate Analysis**: Customizable pass threshold, calculate pass rates
- ✅ **Distribution Analysis**: Data distribution, quartiles, outlier detection
- ✅ **Smart Recognition**: Intelligently identify numeric columns, exclude names, IDs, etc.

### 🏆 Ranking System
- ✅ **Top per Subject**: Automatically find highest scorer in each subject
- ✅ **Overall Rankings**: Calculate total scores and generate top 3 list
- ✅ **Average Rankings**: Find students with best overall performance
- ✅ **Top 3 per Subject**: Detailed top 3 for each subject

### 📈 Data Visualizations (5 Charts)
1. **Subject Average Comparison** - Bar chart with pass line
2. **Total Score Distribution** - Histogram showing normal distribution
3. **Score Box Plots** - Shows distribution, median, outliers
4. **Top 3 Students Radar** - Multi-dimensional comparison
5. **Pass Rate Comparison** - Pass rates by subject with target line

### 🤖 AI-Powered Analysis Report
Auto-generated using Bedrock DeepSeek:
- **Overall Performance**: Class-wide assessment
- **Top Students Analysis**: Characteristics of high achievers
- **Subject Difficulty**: Identify challenging subjects
- **Improvement Suggestions**: Targeted recommendations
- **Trend Predictions**: Data-based future projections

### 🌐 Beautiful HTML Report
- ✅ **Modern Design**: Purple-blue gradient theme
- ✅ **Responsive Layout**: Perfect on desktop, tablet, mobile
- ✅ **Embedded Charts**: Base64 encoded, single self-contained file
- ✅ **Auto-Open**: Automatically opens in browser after generation (macOS)
- ✅ **PDF Export**: Supports direct print or PDF export

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              CSV Data Analysis Complete Workflow             │
└─────────────────────────────────────────────────────────────┘

[1] Create Sandbox instance
     ↓
[2] Install analysis dependencies
     - pandas (data processing)
     - matplotlib (chart generation)
     - numpy (numerical computation)
     ↓
[3] Generate or load test data
     - Option A: Auto-generate 40-student class scores
     - Option B: Upload your own CSV file
     ↓
[4] Execute multi-dimensional data analysis
     - Calculate statistics (8+ dimensions)
     - Generate rankings (10+ types)
     - Create visualizations (5 charts)
     ↓
[5] Prepare data summary
     - Extract key statistics
     - Format as structured description
     ↓
[6] Call Bedrock AI for analysis report
     - Send data summary
     - Receive professional analysis
     ↓
[7] Generate beautiful HTML report
     - Embed all charts (base64)
     - Apply CSS styles
     - Create single-file report
     ↓
[8] Output and display
     - Save to local ./output/analysis_report.html
     - Auto-open in browser
     ↓
✅ Complete data analysis report ready!
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

# Option 1: Use Bearer Token (Recommended)
AWS_BEARER_TOKEN_BEDROCK="your_bearer_token"

# Option 2: Use standard AWS credentials (Optional)
# AWS_ACCESS_KEY_ID="your_aws_access_key"
# AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
```

### Run with Auto-Generated Data (Recommended)

```bash
# Run directly, will auto-generate 40-student class score data
python run.py
```

The program will automatically:
1. ✅ Generate test data (40 students, 6 subjects)
2. ✅ Execute complete analysis
3. ✅ Generate 5 charts
4. ✅ Call AI for report generation
5. ✅ Output HTML report and auto-open

### Analyze Existing CSV File

If you have your own CSV data:

```python
# Modify main() function in run.py

# 1. Comment out auto-generation step 3
# 2. Add code to upload your CSV

csv_content = open("your_data.csv", "r", encoding="utf-8").read()
sandbox.files.write("/tmp/data.csv", csv_content)
csv_path = "/tmp/data.csv"

# 3. Continue with analysis
analysis_results = analyze_csv_in_sandbox(sandbox, csv_path)
```

## 📊 Output

### Terminal Output Example

```
============================================================
✅ Analysis Complete! Summary:
============================================================
📊 Statistical Dimensions: 8
   - Chinese, Math, English, Physics, Chemistry, Biology
   - Total Score, Average Score

🏆 Ranking Categories: 10+
   - Top scorer per subject × 6
   - Top 3 overall
   - Top 3 per subject

📈 Generated Charts: 5 (embedded in HTML)
   - chart_avg_scores.png       (Subject Averages)
   - chart_total_distribution.png (Score Distribution)
   - chart_boxplot.png           (Score Box Plots)
   - chart_radar_top3.png        (Top 3 Radar)
   - chart_pass_rates.png        (Pass Rate Comparison)

📄 HTML Report: ./output/analysis_report.html
   - File Size: ~2.5 MB
   - Contains all charts and statistics
   - Opened in browser
============================================================
```

## 🌐 HTML Report Features

### Visual Design
- **Gradient Theme**: Purple-blue gradient (#667eea → #764ba2)
- **Card Layout**: Clear information blocks, hierarchical
- **Responsive**: Auto-adapts to desktop, tablet, mobile
- **Hover Animation**: Cards rise on hover, enhanced interaction
- **Print Optimized**: Supports direct print or PDF export

### Technical Highlights
- **Embedded Charts**: 5 charts base64-encoded directly in HTML
- **Self-Contained**: No external image files needed, easy to share
- **File Size**: Usually 1-3 MB (including high-res charts)
- **Browser Compatible**: Perfect support for Chrome, Firefox, Safari

### View and Share Report

**Auto-Open** (macOS):
```bash
python run.py
# Opens automatically in browser after completion
```

**Manual Open**:
```bash
# Method 1: Command line
open ./output/analysis_report.html

# Method 2: Double-click file
# Double-click analysis_report.html in file manager

# Method 3: Drag to browser
```

**Export to PDF**:
1. Open report in browser
2. Press `Ctrl+P` (Windows) or `Cmd+P` (macOS)
3. Select "Save as PDF"
4. Adjust page settings, save

**Share with Others**:
- ✅ Send HTML file as email attachment
- ✅ Upload to cloud and share link
- ✅ Embed in webpage using `<iframe>`
- ✅ Convert to PDF and share

## 🏗️ Technical Architecture

```
┌───────────────────────────────────────────────────────────┐
│              CSV Data Analysis Architecture                │
└───────────────────────────────────────────────────────────┘

┌──────────────────┐
│ run.py │
│  (Python Script) │
└────────┬─────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │      Scalebox Sandbox           │
    │  ├─ pandas (data processing)    │
    │  ├─ matplotlib (chart gen)      │
    │  ├─ numpy (computation)         │
    │  └─ CSV file storage            │
    └────────┬────────────────────────┘
             │
             ├─────────────┐
             │             │
             ▼             ▼
    ┌────────────┐  ┌──────────────────┐
    │  Stats     │  │  AWS Bedrock API │
    │  Analysis  │  │  (DeepSeek v3)   │
    │  Charts    │  │  AI Report       │
    └────────┬──┘  └─────┬────────────┘
             │            │
             ▼            ▼
    ┌─────────────────────────────────────────┐
    │      HTML Report Generation             │
    │  ├─ Embed statistics                    │
    │  ├─ Embed base64 charts                 │
    │  ├─ Embed AI analysis                   │
    │  └─ Apply CSS styles                    │
    └────────┬────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │     Output Results                      │
    │  - HTML report (./output/*.html)        │
    │  - Chart files (Sandbox /tmp/*.png)     │
    │  - Auto-open in browser                 │
    └─────────────────────────────────────────┘
```

## 📚 Documentation

For detailed Chinese documentation, see [中文文档](./README_zh.md).

## License

Follow Scalebox and AWS Bedrock terms of service.

## Resources

- [Scalebox Documentation](https://docs.scalebox.dev)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [pandas Documentation](https://pandas.pydata.org/docs/)
- [matplotlib Documentation](https://matplotlib.org/)
