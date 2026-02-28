"use strict";
var FileType;
(function (FileType) {
    FileType["prefab"] = "prefab";
    FileType["script"] = "js";
    FileType["folder"] = "folder";
})(FileType || (FileType = {}));
class FileNode {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        this.name = name;
        this.path = name;
        this.type = type;
    }
    rename(newName) {
        this.name = newName;
    }
    setPath(prefix) {
        this.path = `${prefix}/${this.path}`;
    }
}
class Folder extends FileNode {
    constructor(name) {
        super(name);
        this.children = [];
    }
    addFile(file) {
        this.children.push(file);
        file.setPath(this.path);
    }
    deleteFile(file) {
        this.children = this.children.filter(child => child !== file);
    }
}
class Assets extends Folder {
    constructor() {
        super("Assets");
    }
}
