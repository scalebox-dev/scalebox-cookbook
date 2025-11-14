from dotenv import load_dotenv
import boto3
import json
import logging
import os
from scalebox import Sandbox
from typing import Dict, List, Tuple


load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def call_bedrock_for_analysis(data_summary: str, model_id: str = "deepseek.v3-v1:0") -> str:
    """
    调用 Bedrock 模型生成数据分析报告
    
    Args:
        data_summary: 数据统计摘要
        model_id: Bedrock 模型 ID
        
    Returns:
        AI 生成的分析报告
    """
    try:
        # 获取 AWS 配置
        region = os.getenv('AWS_REGION', 'eu-north-1')
        bedrock_token = os.getenv('AWS_BEDROCK_TOKEN')
        
        # 配置认证
        if bedrock_token:
            os.environ['AWS_SESSION_TOKEN'] = bedrock_token
            logger.info("使用 BedRock Token 认证")
        
        client = boto3.client('bedrock-runtime', region_name=region)
        logger.info(f"连接到 AWS Region: {region}")
        
        # 构建分析提示词
        prompt = f"""你是一位专业的数据分析师。请基于以下班级期末考试成绩统计数据，生成一份详细的分析报告。

数据统计摘要：
{data_summary}

请从以下角度进行分析：
1. **整体表现分析**：班级整体成绩水平、各科目表现
2. **优秀学生分析**：各项第一名的特点和共同点
3. **学科分析**：各科目的难易程度、分数分布特征
4. **改进建议**：针对班级和个人的提升建议
5. **趋势预测**：基于数据的可能趋势

请用专业、客观的语气，生成一份结构清晰的分析报告（约500-800字）。"""
        
        logger.info(f"调用 Bedrock 模型生成分析报告: {model_id}")
        
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.9
        }
        
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        logger.info("✅ 成功收到 Bedrock AI 分析报告")
        
        report = response_body['choices'][0]['message']['content']
        return report
        
    except Exception as e:
        logger.error(f"调用 Bedrock 失败: {str(e)}")
        raise


def install_analysis_dependencies(sandbox: Sandbox) -> None:
    """
    在 Sandbox 中安装数据分析所需的依赖库
    
    Args:
        sandbox: Sandbox 实例
    """
    logger.info("安装分析依赖库...")
    
    # 安装 pandas, matplotlib, numpy
    result = sandbox.commands.run(
        "pip install pandas matplotlib numpy -q",
        timeout=120
    )
    
    if result.exit_code == 0:
        logger.info("✅ 依赖库安装成功")
    else:
        logger.warning(f"依赖库安装可能有问题: {result.stderr}")


def analyze_csv_in_sandbox(sandbox: Sandbox, csv_path: str) -> Dict:
    """
    在 Sandbox 中分析 CSV 数据并生成统计结果和图表
    
    Args:
        sandbox: Sandbox 实例
        csv_path: CSV 文件在 Sandbox 中的路径
        
    Returns:
        包含统计结果和图表路径的字典
    """
    logger.info(f"开始分析 CSV 文件: {csv_path}")
    
    # 创建分析脚本
    analysis_script = """
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import json
import sys

# 设置中文字体（使用 matplotlib 内置字体）
matplotlib.rcParams['font.sans-serif'] = ['DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False

# 读取 CSV 文件
csv_file = sys.argv[1]
df = pd.read_csv(csv_file, encoding='utf-8')

# 基本统计信息
results = {
    "basic_info": {
        "total_students": len(df),
        "subjects": [],
        "statistics": {}
    },
    "rankings": {},
    "charts": []
}

# 识别科目列（排除学号、姓名等非成绩列）
exclude_cols = ['学号', '姓名', '学生ID', '班级', 'ID', 'Name', 'Student_ID']
subject_cols = [col for col in df.columns if col not in exclude_cols and df[col].dtype in ['int64', 'float64']]

results["basic_info"]["subjects"] = subject_cols

# 计算总分和平均分
if len(subject_cols) > 0:
    df['总分'] = df[subject_cols].sum(axis=1)
    df['平均分'] = df[subject_cols].mean(axis=1)
    
    # 各科目统计
    for subject in subject_cols:
        results["basic_info"]["statistics"][subject] = {
            "平均分": round(float(df[subject].mean()), 2),
            "最高分": float(df[subject].max()),
            "最低分": float(df[subject].min()),
            "标准差": round(float(df[subject].std()), 2),
            "及格率": round(float((df[subject] >= 60).sum() / len(df) * 100), 2)
        }
    
    # 总分和平均分统计
    results["basic_info"]["statistics"]["总分"] = {
        "平均分": round(float(df['总分'].mean()), 2),
        "最高分": float(df['总分'].max()),
        "最低分": float(df['总分'].min()),
        "标准差": round(float(df['总分'].std()), 2)
    }
    
    results["basic_info"]["statistics"]["平均分"] = {
        "班级平均": round(float(df['平均分'].mean()), 2),
        "最高平均": round(float(df['平均分'].max()), 2),
        "最低平均": round(float(df['平均分'].min()), 2)
    }
    
    # 排名信息
    name_col = '姓名' if '姓名' in df.columns else ('Name' if 'Name' in df.columns else df.columns[1])
    
    # 各科第一名
    for subject in subject_cols:
        top_idx = df[subject].idxmax()
        results["rankings"][f"{subject}_第一名"] = {
            "姓名": str(df.loc[top_idx, name_col]),
            "分数": float(df.loc[top_idx, subject])
        }
    
    # 总分第一名
    top_idx = df['总分'].idxmax()
    results["rankings"]["总分第一名"] = {
        "姓名": str(df.loc[top_idx, name_col]),
        "总分": float(df.loc[top_idx, '总分']),
        "各科成绩": {subj: float(df.loc[top_idx, subj]) for subj in subject_cols}
    }
    
    # 平均分第一名
    top_idx = df['平均分'].idxmax()
    results["rankings"]["平均分第一名"] = {
        "姓名": str(df.loc[top_idx, name_col]),
        "平均分": round(float(df.loc[top_idx, '平均分']), 2)
    }
    
    # 单科状元（所有科目都是第一的学生）
    top_students = []
    for subject in subject_cols:
        max_score = df[subject].max()
        top_students_subj = df[df[subject] == max_score][name_col].tolist()
        
    # 各科前三名
    for subject in subject_cols:
        top3 = df.nlargest(3, subject)[[name_col, subject]]
        results["rankings"][f"{subject}_前三名"] = [
            {"姓名": str(row[name_col]), "分数": float(row[subject])}
            for _, row in top3.iterrows()
        ]
    
    # 总分前三名
    top3 = df.nlargest(3, '总分')[[name_col, '总分'] + subject_cols]
    results["rankings"]["总分前三名"] = [
        {
            "姓名": str(row[name_col]),
            "总分": float(row['总分']),
            "各科": {subj: float(row[subj]) for subj in subject_cols}
        }
        for _, row in top3.iterrows()
    ]
    
    # 生成图表
    # 1. 各科平均分对比图
    plt.figure(figsize=(12, 6))
    avg_scores = [df[subj].mean() for subj in subject_cols]
    plt.bar(subject_cols, avg_scores, color='skyblue', edgecolor='navy', alpha=0.7)
    plt.axhline(y=60, color='r', linestyle='--', label='Passing Line (60)')
    plt.xlabel('Subjects', fontsize=12)
    plt.ylabel('Average Score', fontsize=12)
    plt.title('Average Scores by Subject', fontsize=14, fontweight='bold')
    plt.ylim(0, 100)
    plt.legend()
    plt.grid(axis='y', alpha=0.3)
    chart1 = '/tmp/chart_avg_scores.png'
    plt.savefig(chart1, dpi=100, bbox_inches='tight')
    plt.close()
    results["charts"].append(chart1)
    
    # 2. 总分分布直方图
    plt.figure(figsize=(10, 6))
    plt.hist(df['总分'], bins=20, color='lightgreen', edgecolor='darkgreen', alpha=0.7)
    plt.xlabel('Total Score', fontsize=12)
    plt.ylabel('Number of Students', fontsize=12)
    plt.title('Distribution of Total Scores', fontsize=14, fontweight='bold')
    plt.grid(axis='y', alpha=0.3)
    chart2 = '/tmp/chart_total_distribution.png'
    plt.savefig(chart2, dpi=100, bbox_inches='tight')
    plt.close()
    results["charts"].append(chart2)
    
    # 3. 各科成绩箱线图
    plt.figure(figsize=(12, 6))
    df[subject_cols].boxplot()
    plt.ylabel('Score', fontsize=12)
    plt.title('Score Distribution by Subject (Box Plot)', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45)
    plt.grid(axis='y', alpha=0.3)
    chart3 = '/tmp/chart_boxplot.png'
    plt.savefig(chart3, dpi=100, bbox_inches='tight')
    plt.close()
    results["charts"].append(chart3)
    
    # 4. 前十名学生雷达图（如果有多个科目）
    if len(subject_cols) >= 3:
        from math import pi
        
        top10 = df.nlargest(10, '总分')
        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='polar'))
        
        angles = [n / float(len(subject_cols)) * 2 * pi for n in range(len(subject_cols))]
        angles += angles[:1]
        
        ax.set_theta_offset(pi / 2)
        ax.set_theta_direction(-1)
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(subject_cols)
        
        # 绘制前3名的雷达图
        for i in range(min(3, len(top10))):
            values = top10.iloc[i][subject_cols].values.tolist()
            values += values[:1]
            ax.plot(angles, values, 'o-', linewidth=2, label=f"{top10.iloc[i][name_col]}")
            ax.fill(angles, values, alpha=0.15)
        
        ax.set_ylim(0, 100)
        plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
        plt.title('Top 3 Students - Subject Performance', fontsize=14, fontweight='bold', pad=20)
        chart4 = '/tmp/chart_radar_top3.png'
        plt.savefig(chart4, dpi=100, bbox_inches='tight')
        plt.close()
        results["charts"].append(chart4)
    
    # 5. 及格率对比图
    plt.figure(figsize=(12, 6))
    pass_rates = [(df[subj] >= 60).sum() / len(df) * 100 for subj in subject_cols]
    bars = plt.bar(subject_cols, pass_rates, color='coral', edgecolor='darkred', alpha=0.7)
    plt.axhline(y=80, color='g', linestyle='--', label='Target (80%)')
    plt.xlabel('Subjects', fontsize=12)
    plt.ylabel('Pass Rate (%)', fontsize=12)
    plt.title('Pass Rate by Subject (>=60)', fontsize=14, fontweight='bold')
    plt.ylim(0, 100)
    plt.legend()
    plt.grid(axis='y', alpha=0.3)
    
    # 在柱子上显示数值
    for bar, rate in zip(bars, pass_rates):
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{rate:.1f}%', ha='center', va='bottom')
    
    chart5 = '/tmp/chart_pass_rates.png'
    plt.savefig(chart5, dpi=100, bbox_inches='tight')
    plt.close()
    results["charts"].append(chart5)

# 输出结果为 JSON
print(json.dumps(results, ensure_ascii=False, indent=2))
"""
    
    # 将分析脚本写入 Sandbox
    script_path = "/tmp/analysis_script.py"
    sandbox.files.write(script_path, analysis_script)
    logger.info(f"分析脚本已写入 Sandbox: {script_path}")
    
    # 执行分析脚本
    logger.info("执行数据分析...")
    result = sandbox.commands.run(
        f"python {script_path} {csv_path}",
        timeout=60
    )
    
    if result.exit_code != 0:
        logger.error(f"分析脚本执行失败: {result.stderr}")
        raise Exception(f"分析失败: {result.stderr}")
    
    # 解析结果
    try:
        analysis_results = json.loads(result.stdout)
        logger.info("✅ 数据分析完成")
        return analysis_results
    except json.JSONDecodeError as e:
        logger.error(f"解析分析结果失败: {e}")
        logger.error(f"输出内容: {result.stdout}")
        raise


def generate_analysis_report(sandbox: Sandbox, analysis_results: Dict, ai_report: str) -> str:
    """
    生成完整的 HTML 格式分析报告文件
    
    Args:
        sandbox: Sandbox 实例
        analysis_results: 统计分析结果
        ai_report: AI 生成的分析报告
        
    Returns:
        报告文件路径
    """
    logger.info("生成 HTML 分析报告文件...")
    
    # 读取图表并转换为 base64（用于嵌入 HTML）
    chart_base64_list = []
    for chart_path in analysis_results['charts']:
        try:
            # 在 Sandbox 中使用 Python 转换图片为 base64
            convert_script = f"""
import base64
with open('{chart_path}', 'rb') as f:
    data = f.read()
    print(base64.b64encode(data).decode())
"""
            result = sandbox.commands.run(f"python3 -c \"{convert_script}\"")
            if result.exit_code == 0:
                chart_base64_list.append(result.stdout.strip())
            else:
                logger.warning(f"转换图表失败: {chart_path}")
                chart_base64_list.append("")
        except Exception as e:
            logger.warning(f"读取图表失败: {chart_path}, {e}")
            chart_base64_list.append("")
    
    # 构建 HTML 报告
    html_report = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>班级期末考试成绩分析报告</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }}
        
        .header p {{
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .content {{
            padding: 40px;
        }}
        
        .section {{
            margin-bottom: 40px;
        }}
        
        .section-title {{
            font-size: 1.8em;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }}
        
        .info-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        
        .info-item {{
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #dee2e6;
        }}
        
        .info-item:last-child {{
            border-bottom: none;
        }}
        
        .info-label {{
            font-weight: bold;
            color: #495057;
        }}
        
        .info-value {{
            color: #667eea;
            font-weight: 600;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }}
        
        th {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }}
        
        td {{
            padding: 12px 15px;
            border-bottom: 1px solid #dee2e6;
        }}
        
        tr:hover {{
            background: #f8f9fa;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }}
        
        .stat-card h3 {{
            font-size: 1.2em;
            margin-bottom: 10px;
            opacity: 0.9;
        }}
        
        .stat-card .stat-value {{
            font-size: 2em;
            font-weight: bold;
        }}
        
        .ranking-card {{
            background: #fff;
            border: 2px solid #667eea;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            transition: transform 0.2s;
        }}
        
        .ranking-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
        }}
        
        .ranking-card h3 {{
            color: #667eea;
            margin-bottom: 10px;
        }}
        
        .rank-badge {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-right: 10px;
        }}
        
        .chart-container {{
            margin: 30px 0;
            text-align: center;
        }}
        
        .chart-container img {{
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        
        .chart-title {{
            font-size: 1.3em;
            color: #495057;
            margin-bottom: 15px;
            font-weight: 600;
        }}
        
        .ai-report {{
            background: #f8f9fa;
            padding: 30px;
            border-radius: 8px;
            border-left: 5px solid #667eea;
            line-height: 1.8;
        }}
        
        .ai-report p {{
            margin-bottom: 15px;
        }}
        
        .footer {{
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }}
        
        .medal {{
            font-size: 1.5em;
            margin-right: 5px;
        }}
        
        @media print {{
            body {{
                background: white;
            }}
            .container {{
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 班级期末考试成绩分析报告</h1>
            <p>基于 AWS Bedrock AI 的智能数据分析</p>
        </div>
        
        <div class="content">
            <!-- 一、基本信息 -->
            <div class="section">
                <h2 class="section-title">一、基本信息</h2>
                <div class="info-card">
                    <div class="info-item">
                        <span class="info-label">学生总数</span>
                        <span class="info-value">{analysis_results['basic_info']['total_students']} 人</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">考试科目</span>
                        <span class="info-value">{', '.join(analysis_results['basic_info']['subjects'])}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">统计维度</span>
                        <span class="info-value">{len(analysis_results['basic_info']['statistics'])} 个</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">生成图表</span>
                        <span class="info-value">{len(analysis_results['charts'])} 张</span>
                    </div>
                </div>
            </div>
            
            <!-- 二、各科统计数据 -->
            <div class="section">
                <h2 class="section-title">二、各科统计数据</h2>
"""
    
    # 各科统计表格
    for subject, stats in analysis_results['basic_info']['statistics'].items():
        html_report += f"""
                <h3 style="color: #495057; margin: 20px 0 10px 0;">📚 {subject}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>指标</th>
                            <th>数值</th>
                        </tr>
                    </thead>
                    <tbody>
"""
        for key, value in stats.items():
            html_report += f"""
                        <tr>
                            <td>{key}</td>
                            <td><strong>{value}</strong></td>
                        </tr>
"""
        html_report += """
                    </tbody>
                </table>
"""
    
    # 排名信息
    html_report += """
            </div>
            
            <!-- 三、优秀学生榜 -->
            <div class="section">
                <h2 class="section-title">三、优秀学生榜 🏆</h2>
                
                <h3 style="color: #495057; margin: 20px 0;">🥇 各科第一名</h3>
                <div class="stats-grid">
"""
    
    # 各科第一名
    for key, value in analysis_results['rankings'].items():
        if '第一名' in key and '前三名' not in key:
            subject = key.replace('_第一名', '')
            if isinstance(value, dict):
                if '总分' in value:
                    html_report += f"""
                    <div class="stat-card">
                        <h3>{subject}</h3>
                        <div class="stat-value">{value['姓名']}</div>
                        <p style="margin-top: 10px; opacity: 0.9;">{value['总分']} 分</p>
                    </div>
"""
                elif '平均分' in value:
                    html_report += f"""
                    <div class="stat-card">
                        <h3>{subject}</h3>
                        <div class="stat-value">{value['姓名']}</div>
                        <p style="margin-top: 10px; opacity: 0.9;">{value['平均分']} 分</p>
                    </div>
"""
                else:
                    html_report += f"""
                    <div class="stat-card">
                        <h3>{subject}</h3>
                        <div class="stat-value">{value['姓名']}</div>
                        <p style="margin-top: 10px; opacity: 0.9;">{value['分数']} 分</p>
                    </div>
"""
    
    html_report += """
                </div>
                
                <h3 style="color: #495057; margin: 30px 0 20px 0;">🏅 总分前三名</h3>
"""
    
    # 总分前三名
    medals = ['🥇', '🥈', '🥉']
    for i, student in enumerate(analysis_results['rankings'].get('总分前三名', []), 0):
        medal = medals[i] if i < 3 else '🏅'
        subjects_str = ' | '.join([f"{k}: {v}" for k, v in student['各科'].items()])
        html_report += f"""
                <div class="ranking-card">
                    <h3><span class="medal">{medal}</span> {student['姓名']} - 总分: {student['总分']} 分</h3>
                    <p style="color: #6c757d;">{subjects_str}</p>
                </div>
"""
    
    # 各科前三名详情
    html_report += """
                <h3 style="color: #495057; margin: 30px 0 20px 0;">📋 各科前三名详情</h3>
"""
    
    for subject in analysis_results['basic_info']['subjects']:
        key = f"{subject}_前三名"
        if key in analysis_results['rankings']:
            html_report += f"""
                <h4 style="color: #667eea; margin: 15px 0 10px 0;">{subject}</h4>
                <table style="max-width: 600px;">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>姓名</th>
                            <th>分数</th>
                        </tr>
                    </thead>
                    <tbody>
"""
            for i, student in enumerate(analysis_results['rankings'][key], 1):
                html_report += f"""
                        <tr>
                            <td>{medals[i-1] if i <= 3 else i}</td>
                            <td>{student['姓名']}</td>
                            <td><strong>{student['分数']}</strong></td>
                        </tr>
"""
            html_report += """
                    </tbody>
                </table>
"""
    
    # 数据可视化图表
    html_report += """
            </div>
            
            <!-- 四、数据可视化图表 -->
            <div class="section">
                <h2 class="section-title">四、数据可视化图表 📈</h2>
"""
    
    chart_titles = [
        "各科平均分对比",
        "总分分布直方图",
        "各科成绩箱线图",
        "前三名学生雷达图",
        "及格率对比图"
    ]
    
    for i, (chart_path, chart_base64) in enumerate(zip(analysis_results['charts'], chart_base64_list)):
        chart_name = chart_titles[i] if i < len(chart_titles) else chart_path.split('/')[-1]
        if chart_base64:
            html_report += f"""
                <div class="chart-container">
                    <div class="chart-title">{i+1}. {chart_name}</div>
                    <img src="data:image/png;base64,{chart_base64}" alt="{chart_name}">
                </div>
"""
        else:
            html_report += f"""
                <div class="chart-container">
                    <div class="chart-title">{i+1}. {chart_name}</div>
                    <p style="color: #6c757d;">图表加载失败: {chart_path}</p>
                </div>
"""
    
    # AI 分析报告
    # 将 AI 报告文本转换为段落
    ai_paragraphs = ai_report.split('\n\n')
    ai_html = '<br><br>'.join([f'<p>{p.strip()}</p>' for p in ai_paragraphs if p.strip()])
    
    html_report += f"""
            </div>
            
            <!-- 五、AI 智能分析 -->
            <div class="section">
                <h2 class="section-title">五、AI 智能分析 🤖</h2>
                <div class="ai-report">
                    {ai_html}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>📊 报告生成时间: 自动生成</p>
            <p>🔧 分析工具: AWS Bedrock DeepSeek + Scalebox + Python</p>
            <p style="margin-top: 10px; color: #adb5bd;">
                © 2024 智能数据分析系统 | 
                <a href="https://docs.scalebox.dev" style="color: #667eea; text-decoration: none;">Scalebox</a> | 
                <a href="https://aws.amazon.com/bedrock/" style="color: #667eea; text-decoration: none;">AWS Bedrock</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    # 保存 HTML 报告
    report_path = "/tmp/analysis_report.html"
    sandbox.files.write(report_path, html_report)
    logger.info(f"✅ HTML 分析报告已保存: {report_path}")
    
    # 同时保存一个可以直接打开的本地副本（如果可能）
    try:
        report_content = sandbox.files.read(report_path)
        logger.info(f"HTML 报告大小: {len(report_content)} 字节")
    except Exception as e:
        logger.warning(f"无法读取报告内容: {e}")
    
    return report_path


def download_charts_from_sandbox(sandbox: Sandbox, chart_paths: List[str], local_dir: str = "./output") -> List[str]:
    """
    从 Sandbox 下载图表文件到本地
    
    Args:
        sandbox: Sandbox 实例
        chart_paths: Sandbox 中的图表路径列表
        local_dir: 本地保存目录
        
    Returns:
        本地文件路径列表
    """
    logger.info(f"下载图表文件到本地目录: {local_dir}")
    
    # 创建本地目录
    os.makedirs(local_dir, exist_ok=True)
    
    local_paths = []
    for chart_path in chart_paths:
        try:
            # 从 Sandbox 读取文件内容
            content = sandbox.files.read(chart_path)
            
            # 保存到本地
            filename = os.path.basename(chart_path)
            local_path = os.path.join(local_dir, filename)
            
            with open(local_path, 'wb') as f:
                f.write(content.encode('latin1') if isinstance(content, str) else content)
            
            local_paths.append(local_path)
            logger.info(f"  ✓ {filename} -> {local_path}")
            
        except Exception as e:
            logger.warning(f"下载 {chart_path} 失败: {e}")
    
    logger.info(f"✅ 成功下载 {len(local_paths)} 个图表文件")
    return local_paths


def main():
    """主函数：完整的 CSV 数据分析流程"""
    
    logger.info("=" * 60)
    logger.info("开始 CSV 数据分析流程")
    logger.info("=" * 60)
    
    # 1. 创建 Sandbox 实例
    logger.info("\n[步骤 1/8] 创建 Sandbox 实例...")
    sandbox = Sandbox.create()
    logger.info(f"✅ Sandbox 创建成功，ID: {sandbox.sandbox_id}")
    
    try:
        # 2. 安装依赖
        logger.info("\n[步骤 2/8] 安装分析依赖库...")
        install_analysis_dependencies(sandbox)
        
        # 3. 生成测试数据（班级期末考试成绩）
        logger.info("\n[步骤 3/8] 生成测试数据...")
        
        test_data_prompt = """生成一个40人班级的期末考试成绩数据，包含以下字段：
学号,姓名,语文,数学,英语,物理,化学,生物

要求：
1. 学号格式：2024001-2024040
2. 姓名：随机中文姓名
3. 各科成绩：30-100分之间的整数，分布合理
4. 确保有优秀学生（90分以上）、中等学生（60-89分）、待提高学生（60分以下）
5. 数据真实合理，符合实际成绩分布规律"""
        
        # 生成 CSV 数据（复用同样的 Bedrock 调用逻辑）
        logger.info("调用 Bedrock 生成测试数据...")
        region = os.getenv('AWS_REGION', 'eu-north-1')
        bedrock_token = os.getenv('AWS_BEDROCK_TOKEN')
        
        if bedrock_token:
            os.environ['AWS_SESSION_TOKEN'] = bedrock_token
        
        bedrock_client = boto3.client('bedrock-runtime', region_name=region)
        
        # 构建 CSV 生成的 prompt
        csv_prompt = f"""你是一个数据生成助手。请严格按照以下要求生成数据：

1. 输出格式：必须是纯CSV格式（逗号分隔值）
2. 第一行：必须是列名（表头）
3. 数据要求：真实、合理、多样化
4. 不要包含任何解释性文字，只输出CSV内容
5. 不要使用markdown代码块标记（如```csv）

任务：{test_data_prompt}

请直接输出CSV数据："""
        
        request_body = {
            "messages": [{"role": "user", "content": csv_prompt}],
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.9
        }
        
        response = bedrock_client.invoke_model(
            modelId="deepseek.v3-v1:0",
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        csv_content = response_body['choices'][0]['message']['content']
        csv_content = csv_content.replace('```csv', '').replace('```', '').strip()
        csv_path = "/tmp/exam_scores.csv"
        sandbox.files.write(csv_path, csv_content)
        logger.info(f"✅ 测试数据已生成: {csv_path}")
        
        # 显示数据预览
        preview = sandbox.commands.run(f"head -n 6 {csv_path}")
        logger.info(f"\n数据预览:\n{preview.stdout}")
        
        # 4. 执行数据分析
        logger.info("\n[步骤 4/8] 执行数据分析和图表生成...")
        analysis_results = analyze_csv_in_sandbox(sandbox, csv_path)
        
        # 5. 生成数据摘要用于 AI 分析
        logger.info("\n[步骤 5/8] 准备数据摘要...")
        summary = f"""
班级人数: {analysis_results['basic_info']['total_students']}人
考试科目: {', '.join(analysis_results['basic_info']['subjects'])}

各科统计:
"""
        for subject, stats in analysis_results['basic_info']['statistics'].items():
            summary += f"\n{subject}:\n"
            for key, value in stats.items():
                summary += f"  - {key}: {value}\n"
        
        summary += "\n优秀学生:\n"
        for key, value in analysis_results['rankings'].items():
            if '第一名' in key:
                summary += f"  - {key}: {value}\n"
        
        # 6. 调用 Bedrock 生成 AI 分析报告
        logger.info("\n[步骤 6/8] 调用 AI 生成分析报告...")
        ai_report = call_bedrock_for_analysis(summary)
        
        # 7. 生成完整 HTML 报告
        logger.info("\n[步骤 7/8] 生成完整 HTML 分析报告...")
        report_path = generate_analysis_report(sandbox, analysis_results, ai_report)
        
        # 8. 下载 HTML 报告到本地
        logger.info("\n[步骤 8/8] 下载 HTML 报告到本地...")
        report_content = sandbox.files.read(report_path)
        
        # 创建本地输出目录
        local_output_dir = "./output"
        os.makedirs(local_output_dir, exist_ok=True)
        
        # 保存 HTML 文件到本地
        local_report_path = os.path.join(local_output_dir, "analysis_report.html")
        with open(local_report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        logger.info(f"✅ HTML 报告已保存到本地: {local_report_path}")
        
        # 获取绝对路径
        abs_report_path = os.path.abspath(local_report_path)
        
        # 输出结果摘要
        logger.info(f"\n{'='*60}")
        logger.info("✅ 分析完成！结果摘要:")
        logger.info(f"{'='*60}")
        logger.info(f"📊 统计维度: {len(analysis_results['basic_info']['statistics'])} 个")
        logger.info(f"🏆 排名类别: {len([k for k in analysis_results['rankings'].keys() if '第一名' in k])} 个")
        logger.info(f"📈 生成图表: {len(analysis_results['charts'])} 张（已嵌入 HTML）")
        logger.info(f"📄 HTML 报告大小: {len(report_content):,} 字节")
        
        logger.info(f"\n🌐 HTML 报告位置:")
        logger.info(f"   本地路径: {abs_report_path}")
        logger.info(f"   Sandbox 路径: {report_path}")
        
        logger.info(f"\n💡 如何查看报告:")
        logger.info(f"   方式 1: 在浏览器中打开文件")
        logger.info(f"           open {abs_report_path}")
        logger.info(f"   方式 2: 双击文件 {local_report_path}")
        logger.info(f"   方式 3: 拖拽到浏览器窗口")
        
        # 尝试自动打开浏览器（macOS）
        try:
            import subprocess
            subprocess.run(['open', abs_report_path], check=False)
            logger.info(f"\n🎉 已自动在浏览器中打开报告！")
        except Exception as e:
            logger.info(f"\n💡 请手动打开报告文件")
        
        logger.info(f"\n{'='*60}")
        logger.info("🎉 CSV 数据分析流程全部完成！")
        logger.info(f"{'='*60}\n")
        
    except Exception as e:
        logger.error(f"\n❌ 执行失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    
    finally:
        # 保留 Sandbox 以便查看结果
        logger.info("\n⚠️  保持 Sandbox 运行以便查看结果")
        logger.info(f"Sandbox ID: {sandbox.sandbox_id}")
        logger.info("使用完毕后请手动关闭: sandbox.kill()")
        # sandbox.kill()


if __name__ == "__main__":
    main()
