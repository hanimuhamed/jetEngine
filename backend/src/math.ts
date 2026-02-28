class Vec3 {
    constructor(public x: number = 0, public y: number = 0, public z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    add(other: Vec3): Vec3 {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    subtract(other: Vec3): Vec3 {
        return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    scale(x: number, y: number, z: number): Vec3 {
        return new Vec3(this.x * x, this.y * y, this.z * z);
    }
    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    normalize(): Vec3 {
        const len = this.magnitude();
        return len > 0 ? this.scale(1 / len, 1 / len, 1 / len) : new Vec3(0, 0, 0);
    }
}

class Mat4 {
    elements: number[];

    constructor(elements?: number[]) {
        this.elements = elements ?? Mat4.identity().elements;
    }

    static identity(): Mat4 {
        return new Mat4([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1
        ]);
    }

    static translation(v: Vec3): Mat4 {
        return new Mat4([
            1,0,0,v.x,
            0,1,0,v.y,
            0,0,1,v.z,
            0,0,0,1
        ]);
    }

    static scale(v: Vec3): Mat4 {
        return new Mat4([
            v.x,0,0,0,
            0,v.y,0,0,
            0,0,v.z,0,
            0,0,0,1
        ]);
    }

    static rotationX(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4([
            1,0,0,0,
            0,c,-s,0,
            0,s,c,0,
            0,0,0,1
        ]);
    }

    static rotationY(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4([
            c,0,s,0,
            0,1,0,0,
            -s,0,c,0,
            0,0,0,1
        ]);
    }

    static rotationZ(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4([
            c,-s,0,0,
            s,c,0,0,
            0,0,1,0,
            0,0,0,1
        ]);
    }

    static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1 / Math.tan(fov / 2);
        const nf = 1 / (near - far);

        return new Mat4([
            f/aspect,0,0,0,
            0,f,0,0,
            0,0,(far+near)*nf,2*far*near*nf,
            0,0,-1,0
        ]);
    }

    static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        return new Mat4([
            2/(right-left),0,0,-(right+left)/(right-left),
            0,2/(top-bottom),0,-(top+bottom)/(top-bottom),
            0,0,-2/(far-near),-(far+near)/(far-near),
            0,0,0,1
        ]);
    }

    multiply(other: Mat4): Mat4 {
        const a = this.elements;
        const b = other.elements;
        const r = new Array(16).fill(0);

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                for (let i = 0; i < 4; i++) {
                    r[row*4+col] += a[row*4+i] * b[i*4+col];
                }
            }
        }

        return new Mat4(r);
    }

    multiplyVec3(v: Vec3): Vec3 {
        const e = this.elements;

        const x = v.x, y = v.y, z = v.z;

        const nx =
            e[0]*x + e[1]*y + e[2]*z + e[3];

        const ny =
            e[4]*x + e[5]*y + e[6]*z + e[7];

        const nz =
            e[8]*x + e[9]*y + e[10]*z + e[11];

        const nw =
            e[12]*x + e[13]*y + e[14]*z + e[15];

        if (nw !== 0) {
            return new Vec3(nx/nw, ny/nw, nz/nw);
        }

        return new Vec3(nx, ny, nz);
    }

    // TRS builder
    static fromTRS(pos: Vec3, rot: Vec3, scale: Vec3): Mat4 {

        const t = Mat4.translation(pos);
        const rx = Mat4.rotationX(rot.x);
        const ry = Mat4.rotationY(rot.y);
        const rz = Mat4.rotationZ(rot.z);
        const s = Mat4.scale(scale);

        return t.multiply(rz.multiply(ry.multiply(rx.multiply(s))));
    }
}

