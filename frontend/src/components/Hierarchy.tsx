import { useState } from "react";
import type { TreeNode, HierarchyProps} from "../types";

function Hierarchy({ data }: HierarchyProps) {
  return (
    <div className="hierarchy">
      {data.map((node) => (
        <TreeItem key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

type TreeItemProps = {
  node: TreeNode;
  depth: number;
};

function TreeItem({ node, depth }: TreeItemProps) {
  const [expanded, setExpanded] = useState(false);

  const isFolder = node.type === "folder";

  return (
    <div>
      <div
        className="tree-item"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => isFolder && setExpanded(!expanded)}
      >
        {isFolder ? (
          <span className="tree-arrow">{expanded ? "▾" : "▸"}</span>
        ) : (
          <span className="tree-arrow-placeholder" />
        )}

        <span className={`tree-label ${node.type}`}>
          {isFolder ? (expanded ? "📂" : "📁") : "📄"} {node.name}
        </span>
      </div>

      {isFolder &&
        expanded &&
        node.children?.map((child) => (
          <TreeItem key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export default Hierarchy;
export type { TreeNode };