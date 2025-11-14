"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";

interface CSVUploaderProps {
  onCSVLoad: (content: string, preview: string[][]) => void;
}

export default function CSVUploader({ onCSVLoad }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;

        // 解析 CSV 预览前 10 行
        Papa.parse(content, {
          preview: 10,
          complete: (results) => {
            onCSVLoad(content, results.data as string[][]);
          },
        });
      };
      reader.readAsText(file);
    },
    [onCSVLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        handleFile(file);
      } else {
        alert("请上传 CSV 文件");
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {fileName ? (
            <div>
              <p className="text-sm font-medium text-gray-700">已选择文件：</p>
              <p className="text-lg font-semibold text-blue-600">{fileName}</p>
              <p className="text-xs text-gray-500 mt-1">点击或拖拽更换文件</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700">
                拖拽 CSV 文件到这里，或点击选择文件
              </p>
              <p className="text-sm text-gray-500 mt-1">
                支持班级成绩表 CSV 格式
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
