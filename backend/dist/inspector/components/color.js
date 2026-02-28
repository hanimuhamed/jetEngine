"use strict";
class Color extends Component {
    constructor(r, g, b, a) {
        super("Color");
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    setRGBA(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    getHex() {
        const rHex = this.r.toString(16).padStart(2, '0');
        const gHex = this.g.toString(16).padStart(2, '0');
        const bHex = this.b.toString(16).padStart(2, '0');
        const aHex = Math.round(this.a * 255).toString(16).padStart(2, '0');
        return `#${rHex}${gHex}${bHex}${aHex}`;
    }
}
