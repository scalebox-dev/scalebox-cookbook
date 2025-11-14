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