class Color extends Component {
    constructor(public r: number, public g: number, public b: number, public a: number) {
        super("Color");
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    setRGBA(r: number, g: number, b: number, a: number): void {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    getHex(): string {
        const rHex = this.r.toString(16).padStart(2, '0');
        const gHex = this.g.toString(16).padStart(2, '0');
        const bHex = this.b.toString(16).padStart(2, '0');
        const aHex = Math.round(this.a * 255).toString(16).padStart(2, '0');
        return `#${rHex}${gHex}${bHex}${aHex}`;
    }
}