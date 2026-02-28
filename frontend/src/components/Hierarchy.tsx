import { useState, useCallback } from "react";
import { useEngineStore } from "../store/engineStore";
import type { Entity } from "../engine/core/Entity";

function Hierarchy() {
  const entities = useEngineStore((s) => s.entities);
  const selectedEntityId = useEngineStore((s) => s.selectedEntityId);
  const cameraEntityId = useEngineStore((s) => s.cameraEntityId);
  const selectEntity = useEngineStore((s) => s.selectEntity);
  const addEntity = useEngineStore((s) => s.addEntity);
  const removeEntity = useEngineStore((s) => s.removeEntity);
  const renameEntity = useEngineStore((s) => s.renameEntity);
  const _tick = useEngineStore((s) => s._tick);
  void _tick;

  const isCamera = selectedEntityId === cameraEntityId;

  return (
    <div className="hierarchy">
      <div className="hierarchy-actions">
        <button
          className="hierarchy-btn"
          onClick={() => addEntity()}
          title="Add Entity"
        >
          + Entity
        </button>
        <button
          className="hierarchy-btn"
          onClick={() => {
            if (selectedEntityId) addEntity(undefined, selectedEntityId);
          }}
          disabled={!selectedEntityId}
          title="Add Child Entity"
        >
          + Child
        </button>
        <button
          className="hierarchy-btn hierarchy-btn-del"
          onClick={() => {
            if (selectedEntityId) removeEntity(selectedEntityId);
          }}
          disabled={!selectedEntityId || isCamera}
          title={isCamera ? "Cannot delete Camera" : "Delete Entity"}
        >
          🗑
        </button>
      </div>
      <div className="hierarchy-list">
        {entities.length === 0 && (
          <div className="hierarchy-empty">No entities in scene</div>
        )}
        {entities.map((entity) => (
          <HierarchyItem
            key={entity.id}
            entity={entity}
            depth={0}
            selectedId={selectedEntityId}
            cameraEntityId={cameraEntityId}
            onSelect={selectEntity}
            onRename={renameEntity}
          />
        ))}
      </div>
    </div>
  );
}

function HierarchyItem({
  entity,
  depth,
  selectedId,
  cameraEntityId,
  onSelect,
  onRename,
}: {
  entity: Entity;
  depth: number;
  selectedId: string | null;
  cameraEntityId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entity.name);
  const [expanded, setExpanded] = useState(true);

  const selected = entity.id === selectedId;
  const isCamera = entity.id === cameraEntityId;
  const hasChildren = entity.children.length > 0;

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
    setEditValue(entity.name);
  }, [entity.name]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (editValue.trim() && editValue !== entity.name) {
      onRename(entity.id, editValue.trim());
    }
  }, [editValue, entity.name, entity.id, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "Escape") {
        setEditing(false);
        setEditValue(entity.name);
      }
    },
    [entity.name]
  );

  return (
    <div>
      <div
        className={`tree-item ${selected ? "tree-item-selected" : ""}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(entity.id)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Arrow for collapsible children */}
        {hasChildren ? (
          <span
            className="tree-arrow"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "▾" : "▸"}
          </span>
        ) : (
          <span className="tree-arrow-placeholder" />
        )}

        <span className="entity-icon">
          {isCamera ? "📷" : "◆"}
        </span>

        {editing ? (
          <input
            className="tree-rename-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`tree-label ${isCamera ? 'camera' : 'file'}`}>
            {entity.name}
          </span>
        )}
      </div>

      {/* Render children */}
      {hasChildren && expanded && entity.children.map((child) => (
        <HierarchyItem
          key={child.id}
          entity={child}
          depth={depth + 1}
          selectedId={selectedId}
          cameraEntityId={cameraEntityId}
          onSelect={onSelect}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

export default Hierarchy;