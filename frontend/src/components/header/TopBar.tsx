import { useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import Toolbar from './Toolbar';
import { FileMenu } from './FileMenu';

export function TopBar() {
  const projectName = useEngineStore(s => s.projectName);
  const setProjectName = useEngineStore(s => s.setProjectName);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);

  return (
    <div className="top-bar">
      <FileMenu />

      <span className="top-bar-title">jetEngine</span>

      {editing ? (
        <input
          className="top-bar-project-input"
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const trimmed = draft.trim();
            if (trimmed) setProjectName(trimmed);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setEditing(false); setDraft(projectName); }
          }}
        />
      ) : (
        <span
          className="top-bar-project-name"
          onClick={() => { setEditing(true); setDraft(projectName); }}
          title="Click to rename project"
        >
          {projectName}
        </span>
      )}

      <Toolbar />
    </div>
  );
}
