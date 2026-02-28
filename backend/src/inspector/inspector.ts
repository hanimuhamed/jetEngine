abstract class Component {
    constructor(public name: string) {}
}

class Inspector {
    constructor(public components: Component[]) {
        this.components = components;
    }
    addScript(script: Script): void {
        this.components.push(script);
    }
    removeScript(scriptName: string): void {
        this.components = this.components.filter(c => c.name !== scriptName);
    }
}

