import { useEffect, useRef } from 'react'
import type * as Monaco from 'monaco-editor'
import * as monaco from 'monaco-editor/editor/editor.api.js'
import 'monaco-editor/languages/definitions/go/register.js'
import 'monaco-editor/languages/definitions/cpp/register.js'
import 'monaco-editor/languages/definitions/python/register.js'
import 'monaco-editor/languages/definitions/java/register.js'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'

globalThis.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

interface MonacoCodeEditorProps {
  value: string
  language: string
  onChange: (value: string) => void
}

export function MonacoCodeEditor({ value, language, onChange }: MonacoCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const languageRef = useRef(language)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    const editor = monaco.editor.create(containerRef.current, {
      value: valueRef.current,
      language: languageRef.current,
      theme: 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 4,
      padding: { top: 14, bottom: 14 },
      ariaLabel: 'Редактор исходного кода',
    })
    editorRef.current = editor
    const subscription = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()))
    return () => {
      subscription.dispose()
      editor.dispose()
      editorRef.current = null
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.getValue() !== value) editor.setValue(value)
  }, [value])

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (model) monaco.editor.setModelLanguage(model, language)
  }, [language])

  return <div className="monaco-editor-frame" ref={containerRef} />
}
