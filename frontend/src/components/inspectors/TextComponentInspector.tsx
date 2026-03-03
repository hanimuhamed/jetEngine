// components/inspectors/TextComponentInspector.tsx
import { useCallback } from 'react';
import { ColorPicker } from '../ColorPicker';
import { TextComponent, FONT_OPTIONS } from '../../engine/components/TextComponent';
import DraggableNumber from '../DraggableNumber';
import type { Entity } from '../../engine/core/Entity';
import { useEngineStore } from '../../store/engineStore';

function findInTree(list: Entity[], id: string): Entity | undefined {
  for (const e of list) {
    if (e.id === id) return e;
    const found = findInTree(e.children, id);
    if (found) return found;
  }
  return undefined;
}

function findEntityAnywhere(entities: Entity[], prefabEntity: Entity | null, id: string): Entity | undefined {
  if (prefabEntity) {
    const found = findInTree([prefabEntity], id);
    if (found) return found;
  }
  return findInTree(entities, id);
}

export function TextComponentInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const tc = entity?.getComponent<TextComponent>('TextComponent');
  if (!tc) return null;

  const update = useCallback((updater: (c: TextComponent) => void) => {
    updateComponent(entityId, 'TextComponent', (comp) => {
      updater(comp as TextComponent);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Text</label>
        <input
          type="text"
          className="inspector-text-input"
          value={tc.text}
          onChange={(e) => update(c => { c.text = e.target.value; })}
        />
      </div>

      <div className="field-group">
        <label className="field-group-label">Font</label>
        <select
          className="inspector-select"
          value={tc.fontFamily}
          onChange={(e) => update(c => { c.fontFamily = e.target.value; })}
        >
          {FONT_OPTIONS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-group-label">Font Size</label>
        <DraggableNumber value={tc.fontSize} onChange={(v) => update(c => { c.fontSize = Math.max(1, v); })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Color</label>
        <ColorPicker
          color={tc.color}
          onChange={(c) => update(comp => { comp.color = c; })}
        />
      </div>

      <div className="field-group">
        <label className="field-group-label">Align</label>
        <select
          className="inspector-select"
          value={tc.textAlign}
          onChange={(e) => update(c => { c.textAlign = e.target.value as 'left' | 'center' | 'right'; })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className="field-group" style={{ flexDirection: 'row', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <input
            type="checkbox"
            checked={tc.bold}
            onChange={(e) => update(c => { c.bold = e.target.checked; })}
          />
          Bold
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <input
            type="checkbox"
            checked={tc.italic}
            onChange={(e) => update(c => { c.italic = e.target.checked; })}
          />
          Italic
        </label>
      </div>
    </div>
  );
}
