import type { PanelProps } from "../types";

function Panel({ title, children, style, className = "", headerRight }: PanelProps) {
  return (
    <div className={`panel ${className}`} style={style}>
      <div className="panel-header">
        <span>{title}</span>
        {headerRight && <div className="panel-header-right">{headerRight}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

export default Panel;