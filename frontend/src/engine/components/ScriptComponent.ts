// engine/components/ScriptComponent.ts
import { Component } from '../core/Component';

export const DEFAULT_SCRIPT_TEMPLATE = (entityName: string) => `// Script for entity: ${entityName}

function onStart() {
  // Called once when the scene starts
}

function onUpdate(deltaTime) {
  // Called every frame
  // transform.x += 100 * deltaTime;
}

function onDestroy() {
  // Called when entity is destroyed
}
`;

export class ScriptComponent extends Component {
  public scriptName: string;
  public scriptSource: string;

  constructor(scriptName: string = 'NewScript', scriptSource?: string) {
    super('ScriptComponent');
    this.scriptName = scriptName;
    this.scriptSource = scriptSource ?? DEFAULT_SCRIPT_TEMPLATE(scriptName);
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      scriptName: this.scriptName,
      scriptSource: this.scriptSource,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.scriptName = (data.scriptName as string) ?? 'NewScript';
    this.scriptSource = (data.scriptSource as string) ?? '';
  }
}
