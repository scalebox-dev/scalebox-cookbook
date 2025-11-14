'use client';

import { useEffect, useRef } from 'react';

interface Step {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'text';
  content: string;
  timestamp: number;
  toolName?: string;
  args?: any;
  result?: any;
}

interface AnalysisProcessProps {
  steps: Step[];
  isAnalyzing: boolean;
}

export default function AnalysisProcess({ steps, isAnalyzing }: AnalysisProcessProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 自动滚动到底部
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'thinking':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'tool_call':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'tool_result':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStepTitle = (step: Step) => {
    switch (step.type) {
      case 'thinking':
        return '🤔 AI 思考中';
      case 'tool_call':
        return `🔧 调用工具: ${step.toolName}`;
      case 'tool_result':
        return `✅ 工具执行完成`;
      default:
        return '💬 AI 回复';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">分析过程</h2>
        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-600">分析中...</span>
          </div>
        )}
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {steps.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            等待开始分析...
          </p>
        ) : (
          steps.map((step, index) => (
            <div
              key={index}
              className="border-l-4 border-gray-200 pl-4 py-2 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {getStepIcon(step.type)}
                <span className="font-semibold text-sm text-gray-700">
                  {getStepTitle(step)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="ml-7 text-sm text-gray-600">
                {step.type === 'tool_call' && step.args && (
                  <div className="bg-purple-50 rounded p-2 mb-2">
                    <p className="font-medium text-purple-700 mb-1">参数：</p>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(step.args, null, 2)}
                    </pre>
                  </div>
                )}

                {step.type === 'tool_result' && step.result && (
                  <div className="bg-green-50 rounded p-2">
                    <p className="font-medium text-green-700 mb-1">结果：</p>
                    <pre className="text-xs overflow-x-auto max-h-40">
                      {typeof step.result === 'string' 
                        ? step.result 
                        : JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                )}

                {step.content && step.type !== 'tool_call' && step.type !== 'tool_result' && (
                  <p className="whitespace-pre-wrap">{step.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
