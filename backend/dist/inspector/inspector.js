"use strict";
class Component {
    constructor(name) {
        this.name = name;
    }
}
class Inspector {
    constructor(components) {
        this.components = components;
        this.components = components;
    }
    addScript(script) {
        this.components.push(script);
    }
    removeScript(scriptName) {
        this.components = this.components.filter(c => c.name !== scriptName);
    }
}
