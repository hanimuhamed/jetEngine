import React, { useRef, useState, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';

/** Parse a .jet filename into a display name */
function parseProjectName(filename: string): string {
  let base = filename.replace(/\.jet$/i, '');
  base = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  base = base.replace(/[_-]/g, ' ');
  base = base.replace(/\b\w/g, c => c.toUpperCase());
  return base.trim() || 'Untitled Project';
}

export function FileMenu() {
  const saveScene = useEngineStore(s => s.saveScene);
  const loadScene = useEngineStore(s => s.loadScene);
  const newProject = useEngineStore(s => s.newProject);
  const projectName = useEngineStore(s => s.projectName);
  const setProjectName = useEngineStore(s => s.setProjectName);

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!fileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fileMenuOpen]);

  const handleNewProject = useCallback(() => {
    setFileMenuOpen(false);
    if (!confirm('Create a new project? Unsaved changes will be lost.')) return;
    newProject();
  }, [newProject]);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileMenuOpen(false);

    const safeName = projectName.replace(/\s+/g, '_').toLowerCase();
    let fileHandle: FileSystemFileHandle | null = null;

    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: `${safeName}.jet`,
          types: [{
            description: 'Jet Engine Project',
            accept: { 'application/octet-stream': ['.jet'] },
          }],
        });
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }

    const json = saveScene();
    const encoder = new TextEncoder();
    const inputStream = new Blob([encoder.encode(json)]).stream();
    const compressedStream = inputStream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();

    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(compressedBlob);
        await writable.close();
        setProjectName(parseProjectName(fileHandle.name));
        return;
      } catch { /* fall through */ }
    }

    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.jet`;
    a.click();
    URL.revokeObjectURL(url);
  }, [saveScene, projectName, setProjectName]);

  const handleLoad = useCallback(() => {
    setFileMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const decompressedStream = file.stream().pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(decompressedStream).text();
      loadScene(text);
      setProjectName(parseProjectName(file.name));
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        loadScene(reader.result as string);
        setProjectName(parseProjectName(file.name));
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  }, [loadScene, setProjectName]);

  return (
    <>
      <div className="file-menu-wrapper" ref={fileMenuRef}>
        <button
          className="file-menu-trigger"
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
        >
          File
        </button>
        {fileMenuOpen && (
          <div className="file-menu-dropdown">
            <div className="file-menu-item" onClick={handleNewProject}>New Project</div>
            <div className="file-menu-item" onClick={handleLoad}>Load Project</div>
            <div className="file-menu-item" onMouseDown={handleSave}>Save Project</div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jet,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
