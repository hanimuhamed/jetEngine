// engine/core/Entity.ts — Entity class for ECS
import { v4 as uuidv4 } from 'uuid';
import { Component } from './Component';

export class Entity {
  public readonly id: string;
  public name: string;
  public tag: string;
  public active: boolean;
  // Components stored by their unique id to support multiple of the same type
  public components: Map<string, Component>;
  public children: Entity[];
  public parent: Entity | null;

  constructor(name: string = 'New Entity', id?: string) {
    this.id = id ?? uuidv4();
    this.name = name;
    this.tag = 'Untagged';
    this.active = true;
    this.components = new Map();
    this.children = [];
    this.parent = null;
  }

  addComponent(component: Component): void {
    this.components.set(component.id, component);
  }

  /**
   * Remove a component. If componentId matches a component id, remove that specific one.
   * If it matches a type string, remove the first component of that type.
   */
  removeComponent(idOrType: string): void {
    // Try by id first
    if (this.components.has(idOrType)) {
      this.components.delete(idOrType);
      return;
    }
    // Otherwise remove first of that type
    for (const [cid, comp] of this.components) {
      if (comp.type === idOrType) {
        this.components.delete(cid);
        return;
      }
    }
  }

  /** Remove a specific component by its unique id */
  removeComponentById(componentId: string): void {
    this.components.delete(componentId);
  }

  getComponent<T extends Component>(type: string): T | null {
    for (const comp of this.components.values()) {
      if (comp.type === type) return comp as T;
    }
    return null;
  }

  /** Get a specific component by its unique component id */
  getComponentById<T extends Component>(componentId: string): T | null {
    return (this.components.get(componentId) as T) ?? null;
  }

  hasComponent(type: string): boolean {
    for (const comp of this.components.values()) {
      if (comp.type === type) return true;
    }
    return false;
  }

  /** Count how many components of this type exist */
  countComponents(type: string): number {
    let n = 0;
    for (const comp of this.components.values()) {
      if (comp.type === type) n++;
    }
    return n;
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
