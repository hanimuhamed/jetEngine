import type { PanelProps } from "../types";

function Panel({ title, children, style, className = "" }: PanelProps) {
  return (
    <div className={`panel ${className}`} style={style}>
      <div className="panel-header">{title}</div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

export default Panel;