'use client';

import { useState } from 'react';
import CSVUploader from './components/CSVUploader';
import AnalysisProcess from './components/AnalysisProcess';
import ChartDisplay from './components/ChartDisplay';

interface Step {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'text';
  content: string;
  timestamp: number;
  toolName?: string;
  args?: any;
  result?: any;
}

interface Chart {
  name: string;
  data: string;
  title: string;
}

export default function Home() {
  const [csvContent, setCSVContent] = useState<string>('');
  const [csvPreview, setCSVPreview] = useState<string[][]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [analysisSteps, setAnalysisSteps] = useState<Step[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(false); // 默认隐藏调试信息
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [charts, setCharts] = useState<Chart[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCSVLoad = (content: string, preview: string[][]) => {
    setCSVContent(content);
    setCSVPreview(preview);
  };

  const handleAnalyze = async () => {
    if (!csvContent) {
      alert('请先上传 CSV 文件');
      return;
    }

    setAnalysisSteps([]);
    setAnalysisResult('');
    setCharts([]);
    setIsLoading(true);

    // 添加初始步骤
    setAnalysisSteps([{
      type: 'thinking',
      content: '开始分析...',
      timestamp: Date.now(),
    }]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvContent,
          systemPrompt,
          userPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown'}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      
      // 在循环外部维护块集合
      const chartChunks: {[chartName: string]: {[index: number]: string}} = {};

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;
          
          // 1. 检查图表分块数据
          let chartChunkMatch;
          while ((chartChunkMatch = buffer.match(/__CHART_CHUNK__(.*?)__END_CHART_CHUNK__/s))) {
            try {
              const { chunk: chartChunk, index, last, name } = JSON.parse(chartChunkMatch[1]);
              
              // 初始化该图表的块集合
              if (!chartChunks[name]) {
                chartChunks[name] = {};
              }
              chartChunks[name][index] = chartChunk;
              
              console.log(`📊 接收 ${name} 块 ${index}${last ? ' (最后)' : ''}`);
              
              if (last) {
                // 合并该图表的所有块
                const completeChartData = Object.keys(chartChunks[name])
                  .sort((a, b) => Number(a) - Number(b))
                  .map(key => chartChunks[name][key])
                  .join('');
                
                // 添加到图表列表，使用友好的标题
                const titleMap: {[key: string]: string} = {
                  'chart_avg': '各科平均分对比',
                  'chart_dist': '成绩分布',
                  'chart_rank': '排名对比'
                };
                
                setCharts(prev => [...prev, {
                  name: name,
                  title: titleMap[name] || name.replace('chart_', '').replace(/_/g, ' '),
                  data: completeChartData
                }]);
                
                console.log(`✅ 图表 ${name} 完整接收`);
              }
            } catch (e) {
              console.error('❌ 解析图表块失败:', e);
            }
            buffer = buffer.replace(/__CHART_CHUNK__.*?__END_CHART_CHUNK__/s, '');
          }
          
          // 2. 检查传输完成标记
          if (buffer.includes('__TRANSFER_COMPLETE__')) {
            console.log('✅ 所有数据传输完成');
            buffer = buffer.replace(/__TRANSFER_COMPLETE__/g, '');
          }
          
          fullText = buffer;
          
          // 更新分析步骤（移除所有数据标记）
          const displayText = fullText
            .replace(/__CHART_CHUNK__.*?__END_CHART_CHUNK__/gs, '')
            .replace(/__TRANSFER_COMPLETE__/g, '');
            
          setAnalysisSteps(prev => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'text') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: displayText },
              ];
            }
            return [
              ...prev,
              {
                type: 'text',
                content: displayText,
                timestamp: Date.now(),
              },
            ];
          });
        }
      }

      // 清理最终结果
      const finalText = fullText
        .replace(/__CHART_CHUNK__.*?__END_CHART_CHUNK__/gs, '')
        .replace(/__TRANSFER_COMPLETE__/g, '');
      setAnalysisResult(finalText);
    } catch (error: any) {
      console.error('分析错误:', error);
      setAnalysisSteps(prev => [
        ...prev,
        {
          type: 'text',
          content: `错误: ${error.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📊 班级成绩分析 Agent
          </h1>
          <p className="text-gray-600">
            基于 AWS Bedrock AI + Scalebox MCP 的智能成绩分析系统
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 左侧：上传和配置 */}
          <div className="space-y-6">
            {/* CSV 上传 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">1. 上传成绩表</h2>
              <CSVUploader onCSVLoad={handleCSVLoad} />
              
              {/* CSV 预览 */}
              {csvPreview.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">数据预览：</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <tbody>
                        {csvPreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className={i === 0 ? 'bg-gray-100 font-semibold' : ''}>
                            {row.map((cell, j) => (
                              <td key={j} className="border px-2 py-1">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Debug 模式配置 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">2. 配置提示词</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDebug}
                    onChange={(e) => setShowDebug(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Debug 模式</span>
                </label>
              </div>

              {showDebug && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      系统提示词（可选）
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="留空使用默认系统提示词..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户提示词
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="例如：请分析班级的平均分、各科第一名..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!csvContent || isLoading}
                className={
                  `w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-all ${
                    !csvContent || isLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`
                }
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    分析中...
                  </span>
                ) : (
                  '🚀 开始分析'
                )}
              </button>
            </div>
          </div>

          {/* 右侧：分析过程 */}
          <div>
            <AnalysisProcess steps={analysisSteps} isAnalyzing={isLoading} />
          </div>
        </div>

        {/* 分析结果文字 */}
        {analysisResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>📝</span> 分析总结
            </h2>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {analysisResult}
              </div>
            </div>
          </div>
        )}

        {/* 图表展示（从沙盒复制出来的） */}
        {charts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📊</span> 数据可视化图表
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {charts.map((chart, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 text-center">
                    {chart.title}
                  </h3>
                  <div className="flex justify-center items-center bg-white rounded p-2">
                    <img 
                      src={`data:image/png;base64,${chart.data}`}
                      alt={chart.title}
                      className="max-w-full h-auto rounded shadow-sm"
                      onError={(e) => {
                        console.error('图片加载失败:', chart.name);
                        e.currentTarget.style.display = 'none';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'text-red-500 text-sm p-4 text-center';
                        errorDiv.textContent = `图片加载失败`;
                        e.currentTarget.parentElement?.appendChild(errorDiv);
                      }}
                      onLoad={() => {
                        console.log('✅ 图片加载成功:', chart.name);
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {chart.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
