'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ReplayEditorProps {
  code: string;
  language: string;
}

export default function ReplayEditor({ code, language }: ReplayEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="replay-editor-container" style={{ flex: 1, height: '100%', minHeight: 400 }}>
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'solid',
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
