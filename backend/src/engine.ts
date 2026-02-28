class Engine {
    private isPlaying: boolean;
    constructor(public hierarchy: Hierarchy, public inspector: Inspector, public assets: Assets, public screen: GameScreen) {
        this.hierarchy = hierarchy;
        this.inspector = inspector;
        this.assets = assets;
        this.screen = screen;
        this.isPlaying = false;
    }
    onStart(): void {
        this.screen.render();
        function traverseAndRunStart(obj: GameObject): void {
            for (const child of obj.children) {
                traverseAndRunStart(child);
            }
            for (const component of obj.inspector.components) {
                if (component instanceof Script) {
                    component.start();
                }
            }  
        }
        for (const obj of this.hierarchy.gameObjects) {
            traverseAndRunStart(obj);
        }
        if (!this.isPlaying) {
            return;
        }
        this.updateLoop();
    }

    updateLoop(): void {
        const deltaTime = 16;
        function traverseAndRunUpdate(obj: GameObject): void {
            for (const child of obj.children) {
                traverseAndRunUpdate(child);
            }
            for (const component of obj.inspector.components) {
                if (component instanceof Script) {
                    component.update(deltaTime);
                }
            }   
        }
        for (const obj of this.hierarchy.gameObjects) {
            traverseAndRunUpdate(obj);
        }
        if (!this.isPlaying) {
            return;
        }
        requestAnimationFrame(this.updateLoop.bind(this));
    }
}