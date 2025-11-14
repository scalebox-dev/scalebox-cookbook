// 类型定义

export interface AnalysisRequest {
  csvContent: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface AnalysisResult {
  basicInfo: {
    totalStudents: number;
    subjects: string[];
    statistics: Record<string, SubjectStats>;
  };
  rankings: Record<string, any>;
  charts: ChartData[];
  aiReport: string;
}

export interface SubjectStats {
  平均分: number;
  最高分: number;
  最低分: number;
  标准差: number;
  及格率?: number;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  data: any[];
}

export interface MCPToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: any;
}

export interface MCPToolResult {
  type: 'tool-result';
  toolCallId: string;
  result: any;
}

export interface StreamEvent {
  type: 'thinking' | 'tool_use' | 'result' | 'error';
  content?: string;
  data?: any;
}
