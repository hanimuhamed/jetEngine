import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        swatchRef.current &&
        !swatchRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position the popover near the swatch
  const handleOpen = () => {
    if (swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <div className="color-picker-wrapper">
      {label && <label className="inspector-label">{label}</label>}
      <div className="color-picker-swatch-row">
        <div
          ref={swatchRef}
          className="color-picker-swatch"
          style={{ backgroundColor: color }}
          onClick={handleOpen}
          title={color}
        />
        <input
          className="color-picker-hex-input"
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>
      {open && (
        <div
          ref={popoverRef}
          className="color-picker-popover"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
