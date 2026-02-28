import { useState, useCallback } from "react";
import { useEngineStore } from "../store/engineStore";

function Hierarchy() {
  const entities = useEngineStore((s) => s.entities);
  const selectedEntityId = useEngineStore((s) => s.selectedEntityId);
  const selectEntity = useEngineStore((s) => s.selectEntity);
  const addEntity = useEngineStore((s) => s.addEntity);
  const removeEntity = useEngineStore((s) => s.removeEntity);
  const renameEntity = useEngineStore((s) => s.renameEntity);

  return (
    <div className="hierarchy">
      <div className="hierarchy-actions">
        <button
          className="hierarchy-btn"
          onClick={() => addEntity()}
          title="Add Entity"
        >
          +
        </button>
        <button
          className="hierarchy-btn hierarchy-btn-del"
          onClick={() => {
            if (selectedEntityId) removeEntity(selectedEntityId);
          }}
          disabled={!selectedEntityId}
          title="Delete Entity"
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
            id={entity.id}
            name={entity.name}
            selected={entity.id === selectedEntityId}
            onSelect={selectEntity}
            onRename={renameEntity}
          />
        ))}
      </div>
    </div>
  );
}

function HierarchyItem({
  id,
  name,
  selected,
  onSelect,
  onRename,
}: {
  id: string;
  name: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
    setEditValue(name);
  }, [name]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (editValue.trim() && editValue !== name) {
      onRename(id, editValue.trim());
    }
  }, [editValue, name, id, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "Escape") {
        setEditing(false);
        setEditValue(name);
      }
    },
    [name]
  );

  return (
    <div
      className={`tree-item ${selected ? "tree-item-selected" : ""}`}
      onClick={() => onSelect(id)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="tree-arrow-placeholder" />
      <span className="entity-icon">◆</span>
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
        <span className="tree-label file">{name}</span>
      )}
    </div>
  );
}

export default Hierarchy;