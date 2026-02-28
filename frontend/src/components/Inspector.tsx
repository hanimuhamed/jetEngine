import { useState, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Transform2DInspector } from './inspectors/Transform2DInspector';
import { SpriteRendererInspector } from './inspectors/SpriteRendererInspector';
import { RigidBody2DInspector } from './inspectors/RigidBody2DInspector';
import { Collider2DInspector } from './inspectors/Collider2DInspector';
import { ScriptComponentInspector } from './inspectors/ScriptComponentInspector';
import { Camera2DInspector } from './inspectors/Camera2DInspector';
import type { Component } from '../engine/core/Component';

const AVAILABLE_COMPONENTS = [
  'Transform2D',
  'SpriteRenderer',
  'RigidBody2D',
  'Collider2D',
  'ScriptComponent',
  'Camera2DComponent',
];

function getInspectorForComponent(
  comp: Component,
  entityId: string
): React.ReactNode {
  switch (comp.type) {
    case 'Transform2D':
      return <Transform2DInspector key={comp.id} entityId={entityId} />;
    case 'SpriteRenderer':
      return <SpriteRendererInspector key={comp.id} entityId={entityId} />;
    case 'RigidBody2D':
      return <RigidBody2DInspector key={comp.id} entityId={entityId} />;
    case 'Collider2D':
      return <Collider2DInspector key={comp.id} entityId={entityId} />;
    case 'ScriptComponent':
      return <ScriptComponentInspector key={comp.id} entityId={entityId} componentId={comp.id} />;
    case 'Camera2DComponent':
      return <Camera2DInspector key={comp.id} entityId={entityId} />;
    default:
      return null;
  }
}

function Inspector() {
  const selectedEntityId = useEngineStore(s => s.selectedEntityId);
  const entities = useEngineStore(s => s.entities);
  const cameraEntityId = useEngineStore(s => s.cameraEntityId);
  const addComponentToEntity = useEngineStore(s => s.addComponentToEntity);
  const removeComponentFromEntity = useEngineStore(s => s.removeComponentFromEntity);
  const setEntityTag = useEngineStore(s => s.setEntityTag);
  const _tick = useEngineStore(s => s._tick);
  void _tick; // subscribe to tick for reactivity

  const [showAddMenu, setShowAddMenu] = useState(false);

  // Find entity in tree (including children)
  const findEntity = useCallback((id: string): ReturnType<typeof entities.find> => {
    const search = (list: typeof entities): typeof entities[number] | undefined => {
      for (const e of list) {
        if (e.id === id) return e;
        const found = search(e.children);
        if (found) return found;
      }
      return undefined;
    };
    return search(entities);
  }, [entities]);

  const entity = selectedEntityId ? findEntity(selectedEntityId) ?? null : null;

  const handleAddComponent = useCallback((type: string) => {
    if (selectedEntityId) {
      addComponentToEntity(selectedEntityId, type);
    }
    setShowAddMenu(false);
  }, [selectedEntityId, addComponentToEntity]);

  if (!entity) {
    return (
      <div className="inspector">
        <div className="inspector-empty">No entity selected</div>
      </div>
    );
  }

  const isCamera = entity.id === cameraEntityId;
  const components = entity.getComponentsList();

  // For ScriptComponent, allow adding more. For others, prevent duplicates.
  const existingTypes = new Set(components.map(c => c.type));
  const addableTypes = AVAILABLE_COMPONENTS.filter(t => {
    if (t === 'ScriptComponent') return true; // always allow adding more scripts
    return !existingTypes.has(t);
  });

  return (
    <div className="inspector">
      <div className="inspector-entity-name">
        {isCamera && <span className="camera-badge">📷 </span>}
        {entity.name}
      </div>
      <div className="inspector-tag-row">
        <label className="inspector-tag-label">Tag</label>
        <input
          type="text"
          className="inspector-text-input"
          value={entity.tag}
          onChange={(e) => setEntityTag(entity.id, e.target.value)}
        />
      </div>
      {components.map(comp => (
        <div key={comp.id} className="inspector-component">
          <div className="inspector-component-header">
            <span className="inspector-component-title">{comp.type}</span>
            {/* Don't allow removing Transform2D or Camera2DComponent from camera */}
            {!(comp.type === 'Transform2D') &&
              !(isCamera && comp.type === 'Camera2DComponent') && (
              <button
                className="inspector-remove-btn"
                onClick={() => removeComponentFromEntity(entity.id, comp.id)}
                title="Remove Component"
              >
                ✕
              </button>
            )}
          </div>
          <div className="inspector-component-body">
            {getInspectorForComponent(comp, entity.id)}
          </div>
        </div>
      ))}

      <div className="inspector-add-component">
        <button
          className="inspector-add-btn"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          + Add Component
        </button>
        {showAddMenu && (
          <div className="inspector-add-menu">
            {addableTypes.length === 0 ? (
              <div className="inspector-add-menu-item disabled">All added</div>
            ) : (
              addableTypes.map(type => (
                <div
                  key={type}
                  className="inspector-add-menu-item"
                  onClick={() => handleAddComponent(type)}
                >
                  {type}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Inspector;