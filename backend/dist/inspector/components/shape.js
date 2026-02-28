"use strict";
class Shape extends Component {
    constructor() {
        super("Shape");
        this.points = [];
        this.points = [new Vec3(-1, -1, 0), new Vec3(1, -1, 0), new Vec3(0, 1, 0)];
    }
    addPoint(point) {
        this.points.push(point);
    }
    removePoint(point) {
        if (this.points.length > 3) {
            this.points = this.points.filter(p => p !== point);
        }
    }
    updatePoint(index, point) {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = point;
        }
    }
    getPoints() {
        return this.points;
    }
} // point + global position used for engine calculations and rendering.
