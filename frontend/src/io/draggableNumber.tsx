import { useState, useRef, useCallback } from "react";
import type { DraggableNumberProps } from "../types";

function DraggableNumber({ value, onChange, label }: DraggableNumberProps) {
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const sensitivity = 0.5;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY;
      const newValue = startValueRef.current + deltaY * sensitivity;
      onChange(parseFloat(newValue.toFixed(2)));
    },
    [onChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      startYRef.current = e.clientY;
      startValueRef.current = value;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [value, handleMouseMove, handleMouseUp]
  );

  return (
    <div className="draggable-number">
      {label && <span className="draggable-label">{label}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onMouseDown={handleMouseDown}
        className={dragging ? "dragging" : ""}
        step="0.1"
      />
    </div>
  );
}

export default DraggableNumber;