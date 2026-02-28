class Shape extends Component {
    points: Vec3[] = [];
    constructor() {
        super("Shape");
        this.points = [new Vec3(-1, -1, 0), new Vec3(1, -1, 0), new Vec3(0, 1, 0)];
    }
    addPoint(point: Vec3): void {
        this.points.push(point);
    }
    removePoint(point: Vec3): void {
        if (this.points.length > 3) {
            this.points = this.points.filter(p => p !== point);
        }
    }
    updatePoint(index: number, point: Vec3): void {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = point;
        }
    }
    getPoints(): Vec3[] {
        return this.points;
    }
} // point + global position used for engine calculations and rendering.