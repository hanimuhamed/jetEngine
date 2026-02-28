enum FileType {
    prefab = "prefab",
    script = "js",
    folder = "folder"
}

class FileNode {
    path: string;
    constructor(public name: string, public type: FileType) {
        this.name = name;
        this.path = name;
        this.type = type;
    }
    rename(newName: string): void {
        this.name = newName;
    }
    setPath(prefix: string): void {
        this.path = `${prefix}/${this.path}`;
    }
}

class Folder extends FileNode {
    public children: FileNode[] = [];
    constructor(name: string, type: FileType) {
        super(name, type);
    }
    addFile(file: FileNode): void {
        this.children.push(file);
        file.setPath(this.path);
    }
    deleteFile(file: FileNode): void {
        this.children = this.children.filter(child => child !== file);
    }
}

class Assets extends Folder {
    constructor() {
        super("Assets", FileType.folder);
    }
}


