import { useState, useRef } from "react";
import type { DraggableNumberProps } from "../types";

function DraggableNumber({ value, onChange }: DraggableNumberProps) {
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const sensitivity = 0.02; // tweak this for speed

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startYRef.current - e.clientY;
    const newValue = startValueRef.current + deltaY * sensitivity;
    onChange(parseFloat(newValue.toFixed(2)));
  };

  const handleMouseUp = () => {
    setDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      onMouseDown={handleMouseDown}
      className={dragging ? "dragging" : ""}
    />
  );
}

export default DraggableNumber;