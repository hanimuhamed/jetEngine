// engine/core/Entity.ts — Entity class for ECS
import { v4 as uuidv4 } from 'uuid';
import { Component } from './Component';

export class Entity {
  public readonly id: string;
  public name: string;
  public active: boolean;
  public components: Map<string, Component>;
  public children: Entity[];
  public parent: Entity | null;

  constructor(name: string = 'New Entity', id?: string) {
    this.id = id ?? uuidv4();
    this.name = name;
    this.active = true;
    this.components = new Map();
    this.children = [];
    this.parent = null;
  }

  addComponent(component: Component): void {
    this.components.set(component.type, component);
  }

  removeComponent(type: string): void {
    this.components.delete(type);
  }

  getComponent<T extends Component>(type: string): T | null {
    return (this.components.get(type) as T) ?? null;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  getComponentsList(): Component[] {
    return Array.from(this.components.values());
  }

  addChild(child: Entity): void {
    child.parent = this;
    this.children.push(child);
  }

  removeChild(childId: string): void {
    this.children = this.children.filter(c => c.id !== childId);
  }

  destroy(): void {
    if (this.parent) {
      this.parent.removeChild(this.id);
    }
    for (const child of this.children) {
      child.destroy();
    }
    this.components.clear();
    this.children = [];
  }
}
