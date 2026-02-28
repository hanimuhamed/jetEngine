"use strict";
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.x = x;
        this.y = y;
        this.z = z;
    }
    add(other) {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    subtract(other) {
        return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    scale(x, y, z) {
        return new Vec3(this.x * x, this.y * y, this.z * z);
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        const len = this.magnitude();
        return len > 0 ? this.scale(1 / len, 1 / len) : new Vec3(0, 0, 0);
    }
}
