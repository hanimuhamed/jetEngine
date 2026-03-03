import Panel from '../../ui/Panel';
import ScriptEditor from './ScriptEditor';
import ConsolePanel from './ConsolePanel';

/** Full-screen script editing layout (75% editor / 25% console) */
export function ScriptLayout() {
  return (
    <div className="script-fullscreen-container">
      <Panel title="SCRIPT EDITOR" className="script-fullscreen-editor" style={{ flex: 3 }}>
        <ScriptEditor />
      </Panel>
      <div className="divider vertical" />
      <Panel title="CONSOLE" className="script-fullscreen-console" style={{ flex: 1 }}>
        <ConsolePanel />
      </Panel>
    </div>
  );
}
