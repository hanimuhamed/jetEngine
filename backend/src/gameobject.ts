const gameObjects: GameObject[] = [];

class GameObject {
    public inspector: Inspector;
    public children: GameObject[];
    public static gameObjectPool: GameObject[] = [];
    constructor(public name: string = "New GameObject") {
        this.name = name;
        const transform = new Transform(new Vec3(), new Vec3(), new Vec3(1, 1, 1));
        const color = new Color(255, 255, 255, 1);
        this.inspector = new Inspector([transform, color]);
        this.children = [];
        GameObject.gameObjectPool.push(this);
    }
    getComponent<T extends Component>(componentType: new (...args: any[]) => T): T | null {
        for (const component of this.inspector.components) {
            if (component instanceof componentType) {
                return component as T;
            }
        }
        return null;
    }
}