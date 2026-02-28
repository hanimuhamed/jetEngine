import { useState, useCallback, useRef } from "react";
import { useEngineStore } from "../store/engineStore";
import { SceneSerializer } from "../engine/scene/SceneSerializer";
import type { Entity } from "../engine/core/Entity";

function Hierarchy() {
  const entities = useEngineStore((s) => s.entities);
  const selectedEntityId = useEngineStore((s) => s.selectedEntityId);
  const cameraEntityId = useEngineStore((s) => s.cameraEntityId);
  const selectEntity = useEngineStore((s) => s.selectEntity);
  const addEntity = useEngineStore((s) => s.addEntity);
  const removeEntity = useEngineStore((s) => s.removeEntity);
  const renameEntity = useEngineStore((s) => s.renameEntity);
  const reorderEntity = useEngineStore((s) => s.reorderEntity);
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
            onReorder={reorderEntity}
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
  onReorder,
}: {
  entity: Entity;
  depth: number;
  selectedId: string | null;
  cameraEntityId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onReorder: (entityId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entity.name);
  const [expanded, setExpanded] = useState(true);
  const [dropZone, setDropZone] = useState<'top' | 'middle' | 'bottom' | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

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

  // ── Drag source: entity from hierarchy ──
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/jet-entity-id', entity.id);
    // Also serialize for asset panel drops (prefab creation)
    e.dataTransfer.setData('application/jet-entity-json', SceneSerializer.serializeEntity(entity));
    e.dataTransfer.setData('application/jet-entity-name', entity.name);
    e.dataTransfer.effectAllowed = 'move';
  }, [entity]);

  // ── Drop target: determine zone (top/middle/bottom) ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) {
      setDropZone('top');
    } else if (y > h * 0.75) {
      setDropZone('bottom');
    } else {
      setDropZone('middle');
    }
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('application/jet-entity-id');
    if (!draggedId || draggedId === entity.id) {
      setDropZone(null);
      return;
    }
    if (dropZone === 'top') {
      onReorder(draggedId, entity.id, 'before');
    } else if (dropZone === 'bottom') {
      onReorder(draggedId, entity.id, 'after');
    } else {
      // middle = make child
      onReorder(draggedId, entity.id, 'inside');
    }
    setDropZone(null);
  }, [entity.id, dropZone, onReorder]);

  const dropClass = dropZone === 'top' ? 'drop-top' : dropZone === 'bottom' ? 'drop-bottom' : dropZone === 'middle' ? 'drop-middle' : '';

  return (
    <div>
      <div
        ref={itemRef}
        className={`tree-item ${selected ? "tree-item-selected" : ""} ${dropClass}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(entity.id)}
        onDoubleClick={handleDoubleClick}
        draggable={!isCamera}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
          onReorder={onReorder}
        />
      ))}
    </div>
  );
}

export default Hierarchy;