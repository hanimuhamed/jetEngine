// engine/core/Component.ts — Base component class for ECS
import { v4 as uuidv4 } from 'uuid';

export abstract class Component {
  public readonly id: string;
  public readonly type: string;
  public enabled: boolean;

  constructor(type: string) {
    this.id = uuidv4();
    this.type = type;
    this.enabled = true;
  }

  abstract serialize(): Record<string, unknown>;
  abstract deserialize(data: Record<string, unknown>): void;
}
