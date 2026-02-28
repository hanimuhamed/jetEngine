import type React from 'react';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  headerRight?: React.ReactNode;
};

export type TreeNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
};

export type HierarchyProps = {
  data: TreeNode[];
};

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type Transform = {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
};

export type DraggableNumberProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
};