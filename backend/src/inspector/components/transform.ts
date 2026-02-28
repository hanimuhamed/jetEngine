class Transform extends Component {
    // TODO: fix this piece of shit
    parent: Transform | null = null;
    children: Transform[] = [];
    private globalPosition: Vec3 = new Vec3();
    private globalRotation: Vec3 = new Vec3();
    private globalSize: Vec3 = new Vec3(1, 1, 1);
    constructor(public localPosition: Vec3 = new Vec3(), public localRotation: Vec3 = new Vec3(), public localSize: Vec3 = new Vec3(1, 1, 1)) {
        super("Transform");
        this.localPosition = localPosition;
        this.localRotation = localRotation;
        this.localSize = localSize;
        this.globalPosition = this.localPosition.add(this.parent ? this.parent.globalPosition : new Vec3());
        this.globalRotation = this.localRotation.add(this.parent ? this.parent.globalRotation : new Vec3());
        this.globalSize = this.localSize.scale(
            this.parent ? this.parent.globalSize.x : 1,
            this.parent ? this.parent.globalSize.y : 1,
            this.parent ? this.parent.globalSize.z : 1
        );
    }
    translate(x: number, y: number, z: number): void {
        this.localPosition = this.localPosition.add(new Vec3(x, y, z));
        for (const child of this.children) {
            child.globalPosition = child.localPosition.add(this.globalPosition);
        }
    }

    rotate(x: number, y: number, z: number): void {
        this.localRotation = this.localRotation.add(new Vec3(x, y, z));
        for (const child of this.children) {
            child.globalRotation = child.localRotation.add(this.globalRotation);
        }
    }

    scale(x: number, y: number, z: number): void {
        this.localSize = this.localSize.add(new Vec3(x, y, z));
        for (const child of this.children) {
            child.globalSize = child.localSize.scale(this.globalSize.x, this.globalSize.y, this.globalSize.z);
        }
    }
    getGlobalPosition(): Vec3 {
        return this.globalPosition;
    }
    getGlobalRotation(): Vec3 {
        return this.globalRotation;
    }
    getGlobalSize(): Vec3 {
        return this.globalSize;
    }
}