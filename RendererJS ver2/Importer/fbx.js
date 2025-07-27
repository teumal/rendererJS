
// 
// FBX binary file format specification                 : https://code.blender.org/2013/08/fbx-binary-file-format-specification/
// FBX File Structures                                  : https://archive.blender.org/wiki/2015/index.php/User:Mont29/Foundation/FBX_File_Structure/#Armature_and_Bones_Armature_and_Bones
// A quick tutorial about the fbx ascii format          : https://banexdevblog.wordpress.com/2014/06/23/a-quick-tutorial-about-the-fbx-ascii-format/
// Explanation on how the edges are stored into the FBX : https://gist.github.com/AndreaCatania/da81840f5aa3b2feedf189e26c5a87e6
// FBX SDK Programmers Guide                            : https://download.autodesk.com/us/fbx/sdkdocs/fbx_sdk_help/files/fbxsdkref/class_k_f_curve_key.html#23fda964e5050a6da358e9c625553650
// INTERPOLATION AND SPLINES                            : https://lee-seokhyun.gitbook.io/game-programming/client/easy-mathematics/gdc2012/undefined-3
//

import { FileStream, DataType, TextEncoding, sizeof } from "./FileStream.js";
import { inflate, BitStream } from "./zlib.js";
import { Vector2, Vector3, Vector4, Matrix4x4, Quaternion, RotationOrder, DualQuaternion, MyMath} from "../Core/MyMath.js";
import { Vertex, Mesh, DeformType, Deformer, Bone, Triangle } from "../Core/Mesh.js";
import { Material } from "../Core/Shader.js";
import { AnimationCurve, AnimationState, ExtrapolationMode, AnimatedProperty, PropertyType } from "../Core/Animator.js";
import { Transform } from "../Core/Transform.js";


/** FBX timestamp 를 초(second) 단위로 변환합니다 */
const KTIME2SEC = 1/46186158000;


/** FBXAnimCurve 에서 키프레임(keyframe) 간의 보간을 어떻게 할지 명시하는 열거형. */
const InterpolationType = {
    Constant : 0x00000002, // Constant value until next key.
    Linear   : 0x00000004, // Linear progression to next key.
    Cubic    : 0x00000008, // Cubic progression to next key.
};


/** FBXAnimCurve 에서 접선의 기울기(tangent)를 구하는데 사용되는 열거형. InterpolationType.Cubic 일때에만 사용됩니다. */
const TangentMode = {
    Auto                   : 0x00000100, // Spline cardinal
    TCB                    : 0x00000200, // Spline TCB
    User                   : 0x00000400, // Next slope at the left equal to slope at the right
    GenericBreak           : 0x00000800, // Independent left and right slopes
    GenericClamp           : 0x00001000, // Auto key should be flat if next or previous keys have same value 
    GenericTimeIndependent : 0x00002000, // Auto key time independent.
};


/** FBXAnimCurve 에서  */
const WeightedMode = {
    Right    : 0x01000000,
    NextLeft : 0x02000000
};


/** FBXAnimCurve 에서 */
const VelocityMode = {
    Right    : 0x10000000, // Right tangent has velocity
    NextLeft : 0x20000000  // Left tangent has velocity
};


/** FBXAnimCurve.keyAttrDataFloat 에서 읽을 값의 인덱스를 나타내는 열거형. */
const AnimCurveDataIndex = {

    // User and Break tangent mode (data are doubles)
    RightSlope     : 0,
    NextLeftSlope  : 1,

    // User and Break tangent break mode (data are kInt16 tokens from weight and converted to doubles)
    RightWeight    : 2,
    NextLeftWeight : 3,

    // Velocity mode
    RightVelocity    : 4,
    NextLeftVelocity : 5,

    // TCB tangent mode (data are floats)
    TCBTension    : 0,
    TCBContinuity : 1,
    TCBBias       : 2,
};


/**  */
const UpVector = {
    XAxis : 0,
    YAxis : 1,
    ZAxis : 2
};


let globalSettings = null;


/** FBX 파일을 파싱한 결과를 담습니다. */
export class FBXFile {
    fileName;
    filemagic; 
    version;
    globalSettings; 

    objects = new Map();
    nodes   = [];

    meshes    = [];
    bones     = [];
    deformers = [];
    materials = [];
    animStack;


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** FBX 파일을 읽고 파싱합니다. */
    #parseFBX(arrayBuffer) {
        const stream = new FileStream(arrayBuffer);

        this.filemagic = stream.readString(TextEncoding.Utf8, 23); // Bytes 0  - 22: "Kaydara FBX Binary  \0", 0x1A, 0x00
        this.version   = stream.read(DataType.Uint32);             // Bytes 23 - 26: the version number. 7300 for version 7.3 for example
    
        if(!this.filemagic.includes("Kaydara FBX Binary")) {
            throw "파일의 확장자가 fbx 가 아닙니다!";
        }

        while(true) {
            const node = new FBXNode(stream, this);

            if(node.name == "" && node.properties == undefined) { // 노드의 이름과 속성이 모두 비어있으면, 그 노드는
                break;                                            // 파일의 끝을 의미한다.
            }
        }
        
        this.globalSettings = globalSettings = new FBXGlobalSettings(this.nodes.find(node => node.name == "GlobalSettings"));

        const geometry    = this.nodes.filter(node => node.name == "Geometry" && node.subclass == "Mesh");
        const model       = this.nodes.filter(node => node.name == "Model");
        const deformer    = this.nodes.filter(node => node.name == "Deformer");
        const material    = this.nodes.filter(node => node.name == "Material");
        const texture     = this.nodes.filter(node => node.name == "Texture");
        const connections = this.nodes.find(node => node.name == "Connections");
        const animStack   = this.nodes.find(node => node.name == "AnimationStack");
        
        if(animStack) {
            this.animStack = new FBXAnimStack(animStack);

            const animLayer     = this.nodes.filter(node => node.name == "AnimationLayer");
            const animCurveNode = this.nodes.filter(node => node.name == "AnimationCurveNode");
            const animCurve     = this.nodes.filter(node => node.name == "AnimationCurve");

            animLayer.forEach(node => this.animStack.animLayers.push(new FBXAnimLayer(node)) );
            animCurveNode.forEach(node => this.animStack.animCurveNodes.push(new FBXAnimCurveNode(node)) );
            animCurve.forEach(node => this.animStack.animCurves.push(new FBXAnimCurve(node)) );
        }

        material.forEach(node => this.materials.push(new FBXMaterial(node)) );
        geometry.forEach(node => this.meshes.push(new FBXMesh(node)) );
        deformer.forEach(node => this.deformers.push(new FBXDeformer(node)) );
        model.forEach(node => this.bones.push(new FBXBone(node)) );

        this.#linkObjects(connections);

        this.meshes.forEach(mesh => mesh.polygonToTriangle());            // 
        this.deformers.forEach(deformer => deformer.matrixToTransform()); // 
        this.bones.forEach(bone => bone.calculateWorld());                // 
    }


    /** Connections 노드를 읽고, Objects 의 노드들을  */
    #linkObjects(connections) {

        connections.forEach((node)=>{
            const child  = this.objects.get(node.properties[1].data); // A first UID (the "child")
            const parent = this.objects.get(node.properties[2].data); // A second UID (the "parent", if 0 it is the (implicit) root node of the FBX doc)

            if(child == undefined || parent == undefined) {
                return;
            }

            if(child.bone && parent.bone) {                          // 1) Model -> Model
                child.bone.transform.parent = parent.bone.transform; //    - FBXBone 의 계층구조를 설정한다.
            }
            else if(child.bone && parent.deformer) {  // 2) Model (LimbNode) -> Deformer (Cluster)
                parent.deformer.bone = child.bone;    //    - FBXDeformer 의 bone 을 설정한다.
                child.bone.cluster = parent.deformer; //    - FBXBone 의 cluster 를 설정한다.
            }
            else if(child.deformer && parent.deformer) {       // 3) Deformer (Cluster) -> Deformer (Skin)
                parent.deformer.clusters.push(child.deformer); //   - FBXDeformer 의 clusters 를 추가한다.
                child.deformer.skin = parent.deformer;         //   - FBXDeformer 의 skin 을 설정한다.
            }
            else if(child.deformer && parent.mesh) {       // 4) Deformer (Skin) -> Geometry (Mesh)
                parent.mesh.skinDeformer = child.deformer; //   - FBXMesh 의 skinDeformer 를 설정한다.
                child.deformer.mesh = parent.mesh;         //   - FBXDeformer 의 mesh 를 설정한다.
            }
            else if(child.mesh && parent.bone) { // 5) Geometry (Mesh) -> Model (Mesh)
                child.mesh.setBone(parent.bone); //     - FBXMesh 의 정점을 변형시킬 bone 을 설정한다.
            }
            else if(child.animCurve && parent.animCurveNode) {
                const curveName = node.properties[3].data;                     // 6) AnimationCurve -> AnimationCurveNode               
                parent.animCurveNode.setAnimCurve(child.animCurve, curveName); //   - FBXAnimCurveNode 에 한 성분(e.g. x)에 대한 FBXAnimCurve 를 설정한다. 
            }
            else if(child.animCurveNode && parent.animLayer) {             // 7) AnimationCurveNode -> AnimationLayer
                parent.animLayer.animCurveNodes.push(child.animCurveNode); //   - FBXAnimLayer 의 animCurveNodes 에 추가한다.
            }
            else if(child.animCurveNode && parent.bone) {               // 8) AnimationCurveNode -> Model
                child.animCurveNode.bone     = parent.bone;             // 
                child.animCurveNode.propType = node.properties[3].data; // 
            }
            else if(child.material && parent.bone) {        // 9) Material -> Model (Mesh)
                parent.bone.materials.push(child.material); //  - layerElementMaterial.elements 를 설정한다.
            }
        });
    }


    /** FBX 파일을 읽고 파싱합니다. 파싱이 완료되었을 때, oncomplete(file : FBXFile) 이 호출됩니다. */
    read(file, oncomplete=null) {
        this.fileName = file.name;

        file.arrayBuffer().then((arrayBuffer)=>{
            this.#parseFBX(arrayBuffer);

            if(oncomplete != null) {
                oncomplete(this);
            }
        });
    }


    /** FBXFile 을 나타내는 string 을 돌려줍니다. */
    toString() { 
        let ret = "";

        ret += `fileName  : ${this.fileName}\n`;
        ret += `filemagic : ${this.filemagic}\n`;
        ret += `version   : ${this.version}\n\n`;

        if(this.globalSettings) {
            ret += this.globalSettings.toString();
        }
        if(this.meshes) {
            this.meshes.forEach(mesh => ret += mesh.toString(this));
        }
        if(this.animStack) {
            ret += this.animStack.toString();
            ret += "==================================\n";
        }
        if(this.bones) {
            ret += `boneCount : ${this.bones.length}\n\n`;
            const rootBones = this.bones.filter(bone => bone.transform.parent == null);
            rootBones.forEach(bone => ret += bone.toString());
            ret += `==================================\n`;
        }

        return ret;
    }


    /** FBXFile 의 정보를 토대로 Mesh 를 생성하여 돌려줍니다. */
    createMesh() {
        const mesh = new Mesh();

        mesh.vertices = [];
        mesh.indices  = [];
        mesh.bones    = FBXBone.createBones(this);

        this.meshes.forEach(fbxmesh => fbxmesh.createMesh(mesh));

        return mesh;
    }


    /** FBXFile 의 정보를 토대로 Material[] 을 생성하여 돌려줍니다. */
    createMaterials(textures) {
        const ret = [];

        this.meshes.forEach(fbxmesh => {

            fbxmesh.submeshes.forEach(submesh => {
                const mat = submesh.material.createMaterial();
                mat.triangleCount = submesh.triangleCount;
                ret.push(mat);
            });
        });
        return ret;
    }


    /** FBXFile 의 정보를 토대로 AnimationState 를 생성하여 돌려줍니다. */
    createAnimationState(gameObject) {
        return this.animStack.createAnimationState(gameObject);
    }


    /** FBXFile 에 저장되어 있는 모든 FBXNode 들의 계층구조를 담은 string 을 얻습니다.
     * 
     *  detail = true 라면, FBXNode.properties 의 정보 또한 표시합니다.
     */
    nodeHierarchy(detail=false) {
        let ret = "";

        for(let i=0; i<this.nodes.length; ) {
            const node = this.nodes[i];
            ret += "\n" + node.hierarchy(detail);
            i=node.endIndex;
        }
        return ret;
    }
};


/** FBXFile.nodes 를 구성하는 노드(node) 하나를 정의합니다. */
export class FBXNode {

    /** NestedList 의 위치를 나타내는데 사용됩니다. */
    fbxfile; beginIndex; endIndex;
    

    /** 노드의 이름 */
    name;


    /** 노드가 가진 FBXProperty 들의 목록 */
    properties;


    /** FBXMesh | FBXBone | FBXDeformer | FBXAnimCurve | FBXAnimCurveNode | FBXAnimLayer | FBXMaterial | FBXTexture */
    mesh; bone; deformer; animCurve; animCurveNode; animLayer; material; texture;


    /////////////////////////
    // Instance methods    //
    /////////////////////////
    

    /** FBXNode 를 생성합니다. 생성된 FBXNode 는 fbxfile.nodes 에 자동으로 삽입됩니다. */
    constructor(stream, fbxfile, parentName="") {
        const endOffset     = stream.read(DataType.Uint32);
        const numProperties = stream.read(DataType.Uint32);
        const propListLen   = stream.read(DataType.Uint32);
        const nameLength    = stream.read(DataType.Uint8);

        this.name       = stream.readString(TextEncoding.Utf8, nameLength);
        this.fbxfile    = fbxfile;
        this.beginIndex = fbxfile.nodes.length;

        fbxfile.nodes.push(this);

        if(numProperties > 0) {                         // property 를 가지고 있다면, numProperties 갯수만큼
            this.properties = new Array(numProperties); // FBXProperty 를 읽어들인다.

            for(let i=0; i<numProperties; ++i) {
                this.properties[i] = new FBXProperty(stream);
            }
        }

        if(stream.readBytes < endOffset) {           // properties 를 읽은 후, NULL-record 가 없다면
            const nullrecordOffset = endOffset - 13; // nested list 가 존재한다는 의미이다.

            while(stream.readBytes < nullrecordOffset) {
                const child = new FBXNode(stream, fbxfile, this.name);
            }
            stream.ignore(13); // NULL-record 를 읽어준다.
        }
        
        this.endIndex = fbxfile.nodes.length;


        if(parentName == "Objects") {            // 부모가 "Objects" 라면, "LSS" property 들을 가진다.
            fbxfile.objects.set(this.uid, this); // Connections 노드에서 사용하기 위해, objects 에 등록한다.
        }
    }


    /** FBXNode 를 나타내는 string 을 돌려줍니다. detail=true 를 인자로 준다면 properties 에
     * 
     *  대한 정보 또한 포함시킵니다. */
    toString(detail=false) {
        let ret = `"${this.name}" (${this.beginIndex})\n`;

        if(detail && this.properties) {

            for(let i=0; i<this.properties.length; ++i) {
                ret += `  |  ${this.properties[i]}\n`;
            }
        }
        return ret;
    }


    /** 현재 노드의 계층구조를 나타내는 string 을 돌려줍니다. detail=true 를 인자로 준다면
     * 
     *  노드들의 properties 에 대한 정보 또한 표시합니다. */
    hierarchy(detail=false) {
        let tab0 = "";
        let tab1 = "";
        let ret  = this.toString(detail);

        const dfs = (node) => {
            tab0 += "  |    ";

            for(let i=node.beginIndex+1, child; i<node.endIndex; i=child.endIndex) {
                child = this.fbxfile.nodes[i];

                ret += tab0 + "\n";
                ret += tab1 + `  |____"${child.name}" (${i})\n`;
                tab1 += "  |    ";

                if(detail && child.properties) {

                    for(let j=0; j<child.properties.length; ++j) {
                        ret += tab1 + `\t${child.properties[j]}\n`;
                    }
                    ret += `${tab1}\n`;
                }

                dfs(child);
                tab1 = tab1.slice(0, tab1.length-7);
            }
            tab0 = tab0.slice(0, tab0.length-7);
        };

        dfs(this);
        return ret;
    }


    /** nestedList 에 들어있는 모든 FBXNode 들에 대해서 callbackFn(node : FBXNode) 를 호출합니다.  */
    forEach(callbackFn) {

        for(let i=this.beginIndex+1; i<this.endIndex; ++i) {
            const child = this.fbxfile.nodes[i];
            callbackFn(child);
        }
    }


    /** nestedList 에서 predicate(node : FBXNode) : boolean 의 조건을 만족하는 첫번째 FBXNode 를 돌려줍니다.  */
    find(predicate) {

        for(let i=this.beginIndex+1; i<this.endIndex; ++i) {
            const child = this.fbxfile.nodes[i];
            if(predicate(child)) return child;
        }
        return undefined;
    }


    /** Object 들의 UID 를 나타내는 bigint 를 얻습니다. Connections 노드를 통해 노드 간의 연결을 확인하는데 사용됩니다. */
    get uid() { return this.properties[0].data; }


    /** Object 들의 Sub-class 를 나타내는 string 을 얻습니다.  */
    get subclass() { return this.properties[2].data; }


    /** NestedList 를 나타내는 FBXNode[] 를 얻습니다. */
    get nestedList() { return this.fbxfile.nodes.slice(this.beginIndex+1, this.endIndex); }
};


/** FBXNode.properties 를 구성하는 속성(property) 하나를 정의합니다. */
export class FBXProperty {

    static #typeinfo = new Map([
        ["Y", { read: FBXProperty.readPrimitive, dataType: DataType.Int16,  ctype: "int16"  }], // Y: 2 byte signed Integer.
        ["C", { read: FBXProperty.readPrimitive, dataType: DataType.Int8,   ctype: "bool"   }], // C: 1 bit boolean (1: true, 0: false) encoded as the LSB of a 1 Byte value.
        ["I", { read: FBXProperty.readPrimitive, dataType: DataType.Int32,  ctype: "int32"  }], // I: 4 byte signed Integer.
        ["F", { read: FBXProperty.readPrimitive, dataType: DataType.Float,  ctype: "float"  }], // F: 4 byte single-precision IEEE 754 number.
        ["D", { read: FBXProperty.readPrimitive, dataType: DataType.Double, ctype: "double" }], // D: 8 byte double-precision IEEE 754 number
        ["L", { read: FBXProperty.readPrimitive, dataType: DataType.Int64,  ctype: "int64"  }], // L: 8 byte signed Integer
        ["f", { read: FBXProperty.readArray,     dataType: DataType.Float,  ctype: "float"  }], // f: Array of 4 byte single-precision IEEE 754 number.
        ["d", { read: FBXProperty.readArray,     dataType: DataType.Double, ctype: "double" }], // d: Array of 8 byte double-precision IEEE 754 number
        ["l", { read: FBXProperty.readArray,     dataType: DataType.Int64,  ctype: "int64"  }], // l: Array of 8 byte signed Integer
        ["i", { read: FBXProperty.readArray,     dataType: DataType.Int32,  ctype: "int32"  }], // i: Array of 4 byte signed Integer
        ["b", { read: FBXProperty.readArray,     dataType: DataType.Int8,   ctype: "bool"   }], // b: Array of 1 byte Booleans (always 0 or 1)
        ["S", { read: FBXProperty.readString,    dataType: DataType.Uint8,  ctype: "string" }], // S: String
        ["R", { read: FBXProperty.readRawData,   dataType: DataType.Uint8,  ctype: "uint8"  }]  // R: raw binary data
    ]);


    /** FBXProperty 의 타입을 나타내는 string. Y/C/I/F/D/L/f/d/l/i/b/R/S 가 가능합니다. */
    typecode;


    /** number | Float32Array | Float64Array | BigInt64Array | Int32Array | Uint8Array */
    data;


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** stream 에서 typecode 를 읽고, FBXProperty 를 초기화합니다. */
    constructor(stream) {
        this.typecode = stream.readString(TextEncoding.Utf8, 1); // TypeCode

        const info = FBXProperty.#typeinfo.get(this.typecode);
        info.read(stream, info.dataType, this);
    }


    /** FBXProperty 를 나타내는 string 을 돌려줍니다. */
    toString() {
        const info  = FBXProperty.#typeinfo.get(this.typecode);
        const ctype = info.ctype;
        
        if(this.typecode == "S") {
            return `+ S:string = "${this.data}"`;
        }
        if(this.arrayType) {
            return `+ ${this.typecode}:${ctype}[${this.data.length}]`
        }
        return `+ ${this.typecode}:${ctype} = ${this.data}`;
    }


    /** FBXProperty 가 Array Type 인지 여부를 돌려줍니다. */
    get arrayType() { return this.typecode == "R" || this.typecode.charCodeAt(0) >= 97; }



    ////////////////////////
    // Static methods     //
    ////////////////////////


    /** typecode == Y/C/I/F/D/L 이라면, Primitive Type 을 읽습니다. data 는 number 입니다. */
    static readPrimitive(stream, dataType, out) {
        out.data = stream.read(dataType);
    }


    /** typecode == f/d/l/i/b 이라면, Array Type 을 읽습니다. data 는 Float32Array | Float64Array | BigInt64Array | Int32Array | Uint8Array 입니다. */
    static readArray(stream, dataType, out) {
        const arrayLength      = stream.read(DataType.Uint32); // ArrayLength
        const encoding         = stream.read(DataType.Uint32); // Encoding
        const compressedLength = stream.read(DataType.Uint32); // CompressedLength

        const byteLength = arrayLength * sizeof(dataType);

        if(encoding == 0) {                        // Encoding == 0 이라면, dataType[arrayLength] 을 읽으면 된다.                           
            out.data = new Uint8Array(byteLength); // 배열의 시작주소 정렬 때문에, ArrayBuffer 를 공유할 수는 없다.

            for(let i=0; i<byteLength; ++i) {
                out.data[i] = stream.read(DataType.Uint8);
            }
        }
        else {                           
            out.data = new Uint8Array(byteLength);    // Encoding == 1 이라면, Uint8[compressedLength] 를 읽으면 된다. 
            inflate(new BitStream(stream), out.data); // deflate/zip 알고리즘으로 압축되어있으므로, inflate 함수로 해제해주어야 한다.
        }

        if(dataType == DataType.Float)  out.data = new Float32Array(out.data.buffer);
        if(dataType == DataType.Double) out.data = new Float64Array(out.data.buffer);
        if(dataType == DataType.Int64)  out.data = new BigInt64Array(out.data.buffer);
        if(dataType == DataType.Int32)  out.data = new Int32Array(out.data.buffer);
    }


    /** typecode == S 이라면, String 을 읽습니다. data 는 string 입니다. */
    static readString(stream, dataType, out) {
        const length = stream.read(DataType.Uint32);
        out.data = stream.readString(TextEncoding.Utf8, length);
    }


    /** typecode == R 이라면, Raw Binary Data 를 읽습니다. data 는 Uint8Array 입니다. */
    static readRawData(stream, dataType, out) {
        const length = stream.read(DataType.Uint32);
        out.data = new Uint8Array(stream.buffer, stream.readBytes, length);
        stream.ignore(length);
    }
};


/** GlobalSettings 노드를 파싱한 결과를 담습니다. */
export class FBXGlobalSettings {
    upAxis;    upAxisSign;
    frontAxis; frontAxisSign;
    coordAxis; coordAxisSign;
    originalUpAxis; originalUpAxisSign;

    toOriginalUpAxis;


    /** GlobalSettings 노드를 읽고, FBXGlobalSettings 을 초기화합니다.  */
    constructor(globalSettings) {
        const axis = [Vector3.right, Vector3.up, Vector3.back];

        globalSettings.forEach((node) => {
            if(node.name == "P") {
                const propName = node.properties[0].data;

                if(propName == "UpAxis")             { this.upAxis = node.properties[4].data; return; }
                if(propName == "UpAxisSign")         { this.upAxisSign = node.properties[4].data; return; }
                if(propName == "FrontAxis")          { this.frontAxis = node.properties[4].data; return; }
                if(propName == "FrontAxisSign")      { this.frontAxisSign = node.properties[4].data; return; }
                if(propName == "CoordAxis")          { this.coordAxis = node.properties[4].data; return; }
                if(propName == "CoordAxisSign")      { this.coordAxisSign = node.properties[4].data; return; }
                if(propName == "OriginalUpAxis")     { this.originalUpAxis = node.properties[4].data; return; }
                if(propName == "OriginalUpAxisSign") { this.originalUpAxisSign = node.properties[4].data; return; }
            }
        });

        if(this.upAxis != this.originalUpAxis || this.upAxisSign != this.originalUpAxisSign) {
            const fromAxis = axis[this.upAxis].mulScalar(this.upAxisSign);
            const toAxis   = axis[this.originalUpAxis].mulScalar(this.originalUpAxisSign);

            this.toOriginalUpAxis = new Transform("ToOriginalUpAxis");
            this.toOriginalUpAxis.rotation = Quaternion.fromTo(fromAxis, toAxis);
        }
    }


    /** FBXGlobalSettings 을 나타내는 string 을 얻습니다. */
    toString() {
        const axis = ["X", "Y", "Z"];
        const sign = ["-", "", "+"];

        let ret = `CoordinateSystem (${this.rightHanded ? "rightHanded" : "leftHanded"}) : \n`;

        ret += `\tup vector          : ${sign[this.upAxisSign+1]}${axis[this.upAxis]}\n`;
        ret += `\tforward vector     : ${sign[this.frontAxisSign+1]}${axis[this.frontAxis]}\n`;
        ret += `\tright vector       : ${sign[this.coordAxisSign+1]}${axis[this.coordAxis]}\n`;
        ret += `\toriginal up vector : ${sign[this.originalUpAxisSign+1]}${axis[this.originalUpAxis]}\n\n`;
        ret += "===============================\n\n";

        return ret;
    }


    /** 3차원 벡터 v 를 RendererJS 가 사용하는 왼손 좌표계로 변환합니다. 결과는 v 에 저장됩니다. */
    toLeftHanded(v) {
        
        if(this.rightHanded) { // 오른손좌표계는 +Z 기저가 카메라를 향해 바라보고 있다(+Z = Vector3.back).
            v.z *= -1;         // 그렇기에 왼손좌표계로 변환하기 위해서는 z *= -1 을 곱해서 180도 회전시켜주어야 한다.
        }
        return v;
    }


    /** 오일러각 (x,y,z) 를 RendererJS 가 사용하는 왼손 좌표계에 맞도록 조합합니다. */
    euler(x, y, z, rotationOrder, out) {

        if(this.rightHanded) {
            return Quaternion.euler(-x, -y, -z, rotationOrder, out);
        }
        return Quaternion.euler(x,y,z, rotationOrder, out);
    }


    /** 오른손 좌표계를 사용하는지 여부를 돌려줍니다. */
    get rightHanded() { return this.coordAxisSign > 0; }
};


/** Geometry 노드를 파싱한 결과를 담습니다. */
export class FBXMesh {
    vertices;
    edges;

    polygonVertexIndex;
    polygonIndex;
    triangleVertexIndex;
    polygonCount;
    submeshes;
    
    layerElementUV;
    layerElementNormal;
    layerElementMaterial;

    bone;
    skinDeformer;


    ////////////////////////////
    // Instance methods       //
    ////////////////////////////


    /** Geometry 노드를 읽고 FBXMesh 를 초기화합니다. 또한 geometry.mesh = this 로 설정됩니다. */
    constructor(geometry) {
        const layerElementUV       = geometry.find(node => node.name == "LayerElementUV");
        const layerElementNormal   = geometry.find(node => node.name == "LayerElementNormal");
        const layerElementMaterial = geometry.find(node => node.name == "LayerElementMaterial");

        this.polygonVertexIndex = geometry.find(node => node.name == "PolygonVertexIndex").properties[0].data; // Int32Array
        this.vertices           = this.readVertices(geometry);                                                 // Vector4[]
        this.edges              = this.readEdges(geometry);

        if(layerElementUV) {

            this.layerElementUV = {
                mappingInfoType   : layerElementUV.find(node => node.name == "MappingInformationType").properties[0].data,   // string
                referenceInfoType : layerElementUV.find(node => node.name == "ReferenceInformationType").properties[0].data, // string
                elementIndex      : layerElementUV.find(node => node.name == "UVIndex"),                                     // Int32Array | undefined
                elements          : this.readUV(layerElementUV)                                                              // Vector2[]
            };
            if(this.layerElementUV.elementIndex) {
                this.layerElementUV.elementIndex = this.layerElementUV.elementIndex.properties[0].data;
            }
        }
        if(layerElementNormal) {

            this.layerElementNormal = {
                mappingInfoType   : layerElementNormal.find(node => node.name == "MappingInformationType").properties[0].data,   // string
                referenceInfoType : layerElementNormal.find(node => node.name == "ReferenceInformationType").properties[0].data, // string
                elementIndex      : layerElementNormal.find(node => node.name == "NormalsIndex"),                                // Int32Array | undefined
                elements          : this.readNormals(layerElementNormal)                                                         // Vector3[]
            };
            if(this.layerElementNormal.elementIndex) {
                this.layerElementNormal.elementIndex = this.layerElementNormal.elementIndex.properties[0].data;
            }
        }
        if(layerElementMaterial) {
            
            this.layerElementMaterial = {
                mappingInfoType   : layerElementMaterial.find(node => node.name == "MappingInformationType").properties[0].data,   // string
                referenceInfoType : layerElementMaterial.find(node => node.name == "ReferenceInformationType").properties[0].data, // string
                elementIndex      : layerElementMaterial.find(node => node.name == "Materials").properties[0].data,                // Int32Array
                elements          : null                                                                                           // FBXMaterial[]
            };
        }

        geometry.mesh = this;
    }


    /** FBXMesh 를 나타내는 string 을 돌려줍니다. */
    toString(fbxfile) {
        let ret = `Mesh ${fbxfile.meshes.indexOf(this)}: ${this.bone ? `\"${this.bone.transform.name}\"` : ""}\n`;

        ret += `\tvertices              : ${this.vertices.length}\n`;
        ret += `\tpolygonVertexIndices  : ${this.polygonVertexIndex.length}\n`;
        ret += `\ttriangleVertexIndices : ${this.triangleVertexIndex.length}\n`;
        ret += `\tpolygonCount          : ${this.polygonCount}\n`;
        ret += `\ttriangleCount         : ${this.triangleVertexIndex.length / 3}\n\n`;

        ret += `\tsubmeshes :\n`;
        
        for(let i=0; i<this.submeshes.length; ++i) {
            const submesh = this.submeshes[i];
            ret += `\t\tmaterial ${i} = { name : \"${submesh.material.name}\", triangleCount : ${submesh.triangleCount} }\n`
        }
        ret += "\n";

        if(this.skinDeformer) {
            const skinningType = this.skinDeformer.skinningType;
            const clusterCount = this.skinDeformer.clusters.length;
            ret += `\tskinDeformer : { skinningType : \"${skinningType}\", clusters : ${clusterCount} }\n\n`
        }
        
        if(this.layerElementUV) {
            ret += `\tuvs               : ${this.layerElementUV.elements.length}\n`;
            ret += `\tmappingInfoType   : \"${this.layerElementUV.mappingInfoType}\"\n`;
            ret += `\treferenceInfoType : \"${this.layerElementUV.referenceInfoType}\"\n`;

            if(this.layerElementUV.elementIndex)  {
                ret += `\tuvIndex           : ${this.layerElementUV.elementIndex.length}\n`;
            }
            ret += "\n";
        }
        if(this.layerElementNormal) {
            ret += `\tnormals           : ${this.layerElementNormal.elements.length}\n`;
            ret += `\tmappingInfoType   : \"${this.layerElementNormal.mappingInfoType}\"\n`;
            ret += `\treferenceInfoType : \"${this.layerElementNormal.referenceInfoType}\"\n`;

            if(this.layerElementNormal.elementIndex)  {
                ret += `\tnormalIndex          : ${this.layerElementNormal.elementIndex.length}\n`;
            }
            ret += "\n";
        }
        if(this.layerElementMaterial) {
            ret += `\tmaterials         : ${this.layerElementMaterial.elementIndex.length}\n`
            ret += `\tmappingInfoType   : \"${this.layerElementMaterial.mappingInfoType}\"\n`;
            ret += `\treferenceInfoType : \"${this.layerElementMaterial.referenceInfoType}\"\n\n`;
        }
        ret += "=================================\n\n";

        return ret;
    }


    /** Geometry 노드에서 Vertices 노드를 읽습니다. 결과는 Vector4[] 입니다. */
    readVertices(geometry) {
        const vertices    = geometry.find(node => node.name == "Vertices").properties[0].data; // Float64Array
        const stream      = new FileStream(vertices);
        const vertexCount = vertices.length / 3;
        const result      = new Array(vertexCount);

        for(let i=0; i<vertexCount; ++i) {
            const pos = stream.read(DataType.Vec3);
            result[i] = globalSettings.toLeftHanded(pos).toVector4(1);
        }
        return result;
    }


    /** Geometry 노드에서 Edges 노드를 읽습니다. 결과는 Int32[] 입니다. */
    readEdges(geometry) {
        const edges = geometry.find(node => node.name == "Edges");
        return edges ? edges.properties[0].data : undefined;
    }


    /** LayerElementUV 노드에서 UV 노드를 읽습니다. 결과는 Vectr2[] 입니다. */
    readUV(layerElementUV) {
        const uvs     = layerElementUV.find(node => node.name == "UV").properties[0].data; // Float64Array
        const stream  = new FileStream(uvs);
        const uvCount = uvs.length / 2;
        const result  = new Array(uvCount);

        for(let i=0; i<uvCount; ++i) {
            const uv = stream.read(DataType.Vec2); // RendererJS 에서 UV 좌표계는 +X, -Y 를 사용하므로
            result[i] = new Vector2(uv.x, 1-uv.y); // uv.y 를 반전시켜서 1-uv.y 로 만들어준다.
        }
        return result;
    }


    /** LayerElementNormal 노드에서 Normals 노드를 읽습니다. 결과는 Vector3[] 입니다. */
    readNormals(layerElementNormal) {
        const normals     = layerElementNormal.find(node => node.name == "Normals").properties[0].data; // Float64Array
        const stream      = new FileStream(normals);
        const normalCount = normals.length / 3;
        const result      = new Array(normalCount);

        for(let i=0; i<normalCount; ++i) {
            const normal = stream.read(DataType.Vec3); 
            result[i] = globalSettings.toLeftHanded(normal);
        }
        return result;
    }


    /** FBXMesh 의 트랜스폼을 나타내는 Bone 을 설정합니다. */
    setBone(bone) {
        this.bone = bone;
        bone.mesh = this;

        if(this.layerElementMaterial) {
            this.layerElementMaterial.elements = bone.materials;
        }
    }


    /** polygon 의 인덱스 버퍼를 triangle 의 인덱스 버퍼로 변환합니다. */
    polygonToTriangle() {
        const polygonVertexIndex  = this.polygonVertexIndex;
        const triangleVertexIndex = this.triangleVertexIndex = [];
        const polygonIndex        = this.polygonIndex = [];
        const submeshes           = this.submeshes = [];

        let vertexCount   = 1;
        let polygonStart  = 0;
        let triangleCount = 0;
        let material      = null;
        this.polygonCount = 0;

        function getIndex(j) {                                  // polygon 의 정점들을 시계방향으로 회전하며 triangle 로 쪼갭니다.
            const repeat = Math.floor(j / (vertexCount+1)) + 1; // 
            return polygonStart + (j * repeat % vertexCount);   // 
        }

        for(let i=0; i<polygonVertexIndex.length; ++i, vertexCount++) {
            polygonIndex.push(this.polygonCount);

            if(polygonVertexIndex[i] < 0) {                     // polygon 하나의 마지막 vertex index 는 1의 보수로 저장되어 있다.
                polygonVertexIndex[i] = ~polygonVertexIndex[i]; // 고로 ~polygonVertexIndex[i] 처럼 해주어야 한다.

                const triCount = vertexCount-2;
                
                for(let i=0, j=0; i<triCount; ++i, j+=2) { // polygon 은 vertexCount-2 개의 삼각형으로 쪼개진다.
                    let index0 = getIndex(j);              // 예를 들어 5각형은 3 개의 삼각형으로 쪼갤 수 있다는 의미.
                    let index1 = getIndex(j+1);
                    let index2 = getIndex(j+2);

                    if(globalSettings.rightHanded) { // 오른손 좌표계라면, 정점들의 z 값이 반전되야 하기 때문에
                        const temp = index0;         // 삼각형을 구성하는 정점들 또한 순서가 반대가 되어야 한다.
                        index0 = index2;
                        index2 = temp;
                    }
                    triangleVertexIndex.push(index0);
                    triangleVertexIndex.push(index1);
                    triangleVertexIndex.push(index2);
                }

                triangleCount += triCount;
                polygonStart += vertexCount;
                vertexCount = 0;
                this.polygonCount++;
            }

            const nextMaterial = this.getElement(this.layerElementMaterial, i, null);
            
            if(material && material != nextMaterial || i+1 == polygonVertexIndex.length) { //
                submeshes.push({ triangleCount : triangleCount, material : material });    // 
                triangleCount = 0;
            }
            material = nextMaterial;
        }
    }


    /** layerElementXXX 에서 i 번째 polygonVertex 가 사용할 element 를 찾아서 돌려줍니다. */
    getElement(layerElement, i, defaultValue) {
        
        if(layerElement == undefined) { // layerElement 가 없다면, defaultValue 를 돌려준다.
            return defaultValue;
        }

        const mappingInfoType   = layerElement.mappingInfoType;
        const referenceInfoType = layerElement.referenceInfoType;
        const elementIndex      = layerElement.elementIndex;
        const elements          = layerElement.elements;


        // i) Polygon 마다 Element 가 하나씩 존재하는 경우 (elements.length == polygonCount)
        if(mappingInfoType == "ByPolygon") {
            const polygonIndex = this.polygonIndex[i];

            if(referenceInfoType.includes("Index")) {
                const index = elementIndex[polygonIndex]; // "IndexToDirect" | "Index"
                return elements[index];
            }
            return elements[polygonIndex]; // "Direct"
        }


        // ii) Polygon 의 Vertex 마다 Element 가 하나씩 존재하는 경우 (elements.length == polygonVertexIndex.length)
        else if(mappingInfoType == "ByPolygonVertex") {

            if(referenceInfoType.includes("Index")) {
                const index = elementIndex[i]; // "IndexToDirect" | "Index"
                return elements[index];
            }
            return elements[i]; // "Direct"
        }


        // iii) Vertex 마다 Element 가 하나씩 존재하는 경우 (elements.length == vertices.length)
        else if(mappingInfoType.includes("ByVert")) {
            const vertexIndex = this.polygonVertexIndex[i];

            if(referenceInfoType.includes("Index")) { 
                const index = elementIndex[vertexIndex]; // "IndexToDirect" | "Index"
                return elements[index];
            }
            return elements[vertexIndex]; // "Direct"
        }


        // iiii) Edge 마다 Element 가 하나씩 존재하는 경우 (elements.length == edges.length)
        else if(mappingInfoType == "ByEdge") {

            if(referenceInfoType.includes("Index")) {

            }
        }


        // iiiii) Element 가 하나만 존재하는 경우 (AllSame, elements.length == 1)
        else {

            if(referenceInfoType.includes("Index")) {
                const index = elementIndex[0]; // "IndexToDirect" | "Index"
                return elements[index];
            }
            return elements[0]; // "Direct"
        }
    }


    /** FBXMesh 를 Mesh 로 변환한 결과를 meshOut 에 저장합니다. */
    createMesh(meshOut=new Mesh()) {
        const vertexOffset = meshOut.vertices.length;
        const deformers    = this.skinDeformer ? this.skinDeformer.createDeformers(this.vertices.length) : null;

        for(let i=0; i<this.polygonVertexIndex.length; ++i) { // polygonVertex 마다 고유한 Vertex 인스턴스를 생성한다.
            const vertexIndex = this.polygonVertexIndex[i];   // 

            const pos    = this.vertices[vertexIndex];
            const uv     = this.getElement(this.layerElementUV, i, Vector3.zero);
            const normal = this.getElement(this.layerElementNormal, i, Vector3.zero);
            const vertex = new Vertex(pos, uv);

            vertex.deformer = deformers ? deformers[vertexIndex] : null;
            vertex.normal   = normal;

            meshOut.vertices.push(vertex);
        }
        for(let i=0; i<this.triangleVertexIndex.length; ++i) {
            meshOut.indices.push(vertexOffset + this.triangleVertexIndex[i]);
        }

        if(this.bone) {                                     // 
            this.bone.transformMesh(vertexOffset, meshOut); //
        }
    }
};


/** Model 노드를 파싱한 결과를 담습니다. */
export class FBXBone {
    rotationOrder = RotationOrder.EulerXYZ; // rotationOrder
    transform     = new Transform();        // global current position

    localScale;    // localScale    = Soff * Sp * S * Sp-1
    localRotation; // localRotation = Roff * Rp * Rpre * R * Rpost * Rp-1
    localPosition; // localPosition = T

    RoffRpRpre; // RoffRpRpre = Roff * Rp * Rpre
    RpostInvRp; // RpostInvRp = Rpost * Rp-1
    SoffSp;     // SoffSp     = Soff * Sp
    invSp;      // invSp      = Sp-1

    mesh;      //
    cluster;   //
    materials; // 


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** Model 노드를 읽고 FBXBone 을 초기화합니다. 또한 model.bone = this 로 설정됩니다. 본의 worldTransform 은 다음과 같이 계산됩니다:
     * 
     *  WorldTransform = ParentWorldTransform * T * Roff * Rp * Rpre * R * Rpost * Rp-1 * Soff * Sp * S * Sp-1
     * 
     *  본래 Geometric transform 을 나타내는 OT, OR, OS 또한 계산해야 하지만, 99% 로 항등원(identity)이기에 무시합니다. */
    constructor(model) {
        const fbxbone       = this;
        const rotationOrder = model.find(node => node.name == "P" && node.properties[0].data == "RotationOrder");

        const T     = new Vector3();    // T    : Translation
        const Roff  = new Quaternion(); // Roff : Rotation offset
        const Rp    = new Quaternion(); // Rp   : Rotation pivot
        const Rpre  = new Quaternion(); // Rpre : Pre-rotation
        const R     = new Quaternion(); // R    : Rotation
        const Rpost = new Quaternion(); // Rpost: Post-rotation
        const Soff  = Vector3.one;      // Soff : Scaling offset
        const Sp    = Vector3.one;      // Sp   : Scaling pivot
        const S     = Vector3.one;      // S    : Scaling

        function readQuat(node, out) {
            const x = node.properties[4].data;
            const y = node.properties[5].data;
            const z = node.properties[6].data;
            globalSettings.euler(x, y, z, fbxbone.rotationOrder, out);
        }
        function readVec3(node, out) {
            const x = node.properties[4].data;
            const y = node.properties[5].data;
            const z = node.properties[6].data;
            out.assign(x,y,z);
        }

        if(rotationOrder) {
            this.rotationOrder = this.rotationOrder.properties[4].data;
        }
        if(model.subclass == "Mesh") {
            this.materials = [];
        }

        model.forEach((node) => {
            if(node.name == "P") {
                const propName = node.properties[0].data;

                if(propName == "Lcl Rotation")    { readQuat(node, R); return; }
                if(propName == "Lcl Translation") { readVec3(node, T); return; }
                if(propName == "Lcl Scaling")     { readVec3(node, S); return; }
                if(propName == "PreRotation")     { readQuat(node, Rpre); return; }
                if(propName == "PostRotation")    { readQuat(node, Rpost); return; }
                if(propName == "RotationOffset")  { readQuat(node, Roff); return; }
                if(propName == "RotationPivot")   { readQuat(node, Rp); return;}
                if(propName == "ScalingOffset")   { readVec3(node, Soff); return; }
                if(propName == "ScalingPivot")    { readVec3(node, Sp); return; }
            }
        });

        this.transform.name = model.properties[1].data.replace("\x00\x01Model", "");

        this.RoffRpRpre = Quaternion.mulQuat(Rpre, Rp, Roff);        // Roff * Rp * Rpre
        this.RpostInvRp = Quaternion.mulQuat(Rp.conjugate(), Rpost); // Rpost * Rp-1
        this.SoffSp     = Sp.mulVector(Soff);                        // Soff * Sp
        this.invSp      = Vector3.one.divVector(Sp);                 // Sp-1

        this.localScale    = S;
        this.localRotation = R;
        this.localPosition = globalSettings.toLeftHanded(T);

        this.calculateLocal(S, R, T);

        model.bone = this;
    }


    /** FBXBone 을 나타내는 string 을 돌려줍니다. */
    toString() { return this.transform.hierarchy; }


    /** mesh.vertices[vertexOffset...] 의 정점들을 world space 로 변환시킵니다. 
     * 
     *  해당 함수는 Model 노드가 subclass == "Mesh" 인 경우에만 허용됩니다. 이 경우 FBXBone 은
     * 
     *  FBXMesh 의 global current position 을 의미하기 때문입니다.
     */
    transformMesh(vertexOffset, mesh) {
        const vertices = mesh.vertices; 
        const TRS      = this.transform.TRS();
        const invWT    = this.transform.invTRS().transpose();

        for(let i=vertexOffset; i<vertices.length; ++i) {
            const vert = vertices[i];
            
            vert.position = TRS.mulVector(vert.position);
            vert.normal   = invWT.mulVector(vert.normal.toVector4(0)).toVector3();
            vert.normal.normalize(vert.normal, vert.normal);
        }
    }


    /** LocalTransform = T * Roff * Rp * Rpre * R * Rpost * Rp-1 * Soff * Sp * S * Sp-1 를 계산합니다.
     * 
     *  결과는 S, R, T 에 그대로 저장됩니다. 해당 함수를 호출하기 전에 globalSettings 의 메소드으로 S, R, T 를 
     * 
     *  RendererJS 가 사용하는 왼손좌표계(left-handed coordnate system)로 변환해야 합니다. */
    calculateLocal(S, R, T) {

        if(S) {
            this.invSp.mulVector(S, S).mulVector(this.SoffSp, S); // S = Soff * Sp * S * Sp-1
        }
        if(R) {
            this.RpostInvRp.mulQuat(R, this.RoffRpRpre, R); // R = Roff * Rp * Rpre * R * Rpost * Rp-1
        }
    }


    /** WorldTransform = ParentWorldTransform * LocalTransform 를 계산합니다. 해당 함수를 호출하기 전에 
     * 
     *  ParentWorldTransform 을 계산할 수 있도록, FBXFile.#linkObjects() 를 먼저 호출해야 합니다.
     */
    calculateWorld() { this.transform.setLocalTransform(this.localScale, this.localRotation, this.localPosition); }


    /** FBXBone 을 Bone 으로 변환한 결과를 돌려줍니다. */
    createBone() { return new Bone(this.transform.name, this.transform); }


    ///////////////////////////
    // Static methods        //
    ///////////////////////////
    

    /** FBXFile 에서 FBXBone 들을 읽고 Bone 들을 생성합니다. 결과는 Map<string, Bone> 입니다.  */
    static createBones(fbxfile) {
        const bones = new Map();

        // i) FBXBone.name 을 가진 Bone 들을 생성한다.
        fbxfile.bones.forEach(fbxbone => bones.set(fbxbone.transform.name, fbxbone.createBone()) );


        // ii) 본들의 계층구조(hierarchy)를 설정한다.
        fbxfile.bones.forEach(fbxbone => {
            const bone = bones.get(fbxbone.transform.name);
            fbxbone = fbxbone.transform;

            for(let i=0; i<fbxbone.childCount; ++i) {
                const child = bones.get(fbxbone.getChild(i).name);
                child.parent = bone;
            }
        });


        // iii) 본들의 바인딩 포즈(bindPose) 를 설정한다.
        fbxfile.bones.forEach(fbxbone => {
            const bone = bones.get(fbxbone.transform.name);
            bone.setBindPose(bone);
        });

        return bones;
    }
};


/** Deformer 노드를 파싱한 결과를 담습니다. */
export class FBXDeformer {

    /** Skin Deformer 에서만 사용되는 필드. */
    skinningType;
    blendIndexes;
    blendWeights;
    clusters;
    mesh;


    /** Cluster Deformer 에서만 사용되는 필드. */
    skin;
    bone;
    weights;
    indexes;
    transform;               // Transform               : the global init position of the `this.skin.mesh.vertices`
    transformLink;           // TransformLink           : the global init position of the `this.bone`
    transformAssociateModel; // TransformAssociateModel : 


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** Deformer 노드를 읽고 FBXDeformer 를 초기화합니다. 또한 deformer.deformer = this 로 설정됩니다. */
    constructor(deformer) {

        /** node 에서 4차원 행렬을 읽습니다. 결과는 Matrix4x4 입니다. */
        function readMat4x4(node) {
            const stream = new FileStream(node.properties[0].data);

            const mat4x4 = new Matrix4x4(   // 행렬은 표준기저벡터(basisX, basisY, basisZ, basisW)들이 
                stream.read(DataType.Vec4), // 순서대로 저장되어 있다.
                stream.read(DataType.Vec4),
                stream.read(DataType.Vec4),
                stream.read(DataType.Vec4)
            );
            return mat4x4;
        }

        if(deformer.subclass == "Skin") { // 
            this.clusters     = [];       // 
            this.skinningType = "Linear";
        }

        deformer.forEach((node)=>{

            if(deformer.subclass == "Skin") {
                if(node.name == "SkinningType") { this.skinningType = node.properties[0].data; return; }
                if(node.name == "Indexes")      { this.blendIndexes = node.properties[0].data; return; }
                if(node.name == "BlendWeights") { this.blendWeights = node.properties[0].data; return; }
            }
            else {
                if(node.name == "Transform")               { this.transform               = readMat4x4(node); return; }
                if(node.name == "TransformLink")           { this.transformLink           = readMat4x4(node); return; }
                if(node.name == "TransformAssociateModel") { this.transformAssociateModel = readMat4x4(node); return; }
                if(node.name == "Indexes")                 { this.indexes                 = node.properties[0].data; return; }
                if(node.name == "Weights")                 { this.weights                 = node.properties[0].data; return; }
            }
        });
        deformer.deformer = this;
    }


    /** Transform, TransformLink, TransformAssociateModel 행렬(Matrix4x4)을 Transform 으로 변환합니다. */
    matrixToTransform() {
        const euler = new Vector3();
        const bone  = this.bone;

        // i) Transform 행렬이 존재하는 경우
        if(this.transform) {
            const transform = this.transform = new Transform("Transform", this.transform);
            Quaternion.toEuler(transform.rotation, bone.rotationOrder, euler);

            transform.rotation = globalSettings.euler(euler.x, euler.y, euler.z, bone.rotaitonOrder);
            transform.position = globalSettings.toLeftHanded(transform.position);
        }

        // ii) TransformLink 행렬이 존재하는 경우
        if(this.transformLink) {
            const transformLink = this.transformLink = new Transform("TransformLink", this.transformLink);
            Quaternion.toEuler(transformLink.rotation, bone.rotationOrder, euler);

            transformLink.rotation = globalSettings.euler(euler.x, euler.y, euler.z, bone.rotaitonOrder);
            transformLink.position = globalSettings.toLeftHanded(transformLink.position);
        }

        // iii) TransformAssociateModel 행렬이 존재하는 경우
        if(this.transformAssociateModel) {
            const transformAssociateModel = this.transformAssociateModel = new Transform("TransformAssociateModel", this.transformAssociateModel);
            Quaternion.toEuler(transformAssociateModel.rotation, bone.rotationOrder, euler);

            transformAssociateModel.rotation = globalSettings.euler(euler.x, euler.y, euler.z, bone.rotaitonOrder);
            transformAssociateModel.position = globalSettings.toLeftHanded(transformAssociateModel.position);
        }
    }


    /**  */
    linear(deformers) {
        const weights  = this.weights;
        const indexes  = this.indexes;
        const boneName = this.bone.transform.name;

        if(weights == undefined || indexes == undefined) {
            return;
        }
        for(let i=0; i<indexes.length; ++i) {        // indexes 는 PolygonVertexIndex 의 값이 담겨 있으며,
            const deformer = deformers[indexes[i] ]; // indexes[i] 위치의 Deformer 와 연결된다.

            if(deformer.weights == undefined)   deformer.weights = [];
            if(deformer.boneNames == undefined) deformer.boneNames = [];

            deformer.deformType = DeformType.Linear;
            deformer.weights.push(weights[i]);
            deformer.boneNames.push(boneName);
        }
    }


    /**  */
    dualQuaternion(deformers) {
        const weights  = this.weights;
        const indexes  = this.indexes;
        const boneName = this.bone.transform.name;

        if(weights == undefined || indexes == undefined) {
            return;
        }
        for(let i=0; i<indexes.length; ++i) {        // indexes 는 PolygonVertexIndex 의 값이 담겨 있으며,
            const deformer = deformers[indexes[i] ]; // indexes[i] 위치의 Deformer 와 연결된다.

            if(deformer.weights == undefined)   deformer.weights = [];
            if(deformer.boneNames == undefined) deformer.boneNames = [];

            deformer.deformType = DeformType.DualQuaternion;
            deformer.weights.push(weights[i]);
            deformer.boneNames.push(boneName);
        }
    }


    /**  */
    blend(deformers, skinDeformer) {
        const weights  = this.weights;
        const indexes  = this.indexes;
        const boneName = this.bone.transform.name;

        const blendWeights = skinDeformer.blendWeights; // blendIndexes 는 PolygonVertexIndex 의 값이 담겨 있으며,
        const blendIndexes = skinDeformer.blendIndexes; // blendIndexes[i] 위치의 blendWeights[i] 와 연결된다.

        if(weights == undefined || indexes == undefined) {
            return;
        }
        for(let i=0; i<indexes.length; ++i) { // indexes 는 PolygonVertexIndex 의 값이 담겨 있으며,
            const vertexIndex = indexes[i];   // indexes[i] 위치의 Deformer, weightIndexes[i] 위치의 blendWeight 와 연결된다.
            const deformer    = deformers[vertexIndex];
            const weightIndex = blendIndexes[vertexIndex];

            if(deformer.weights == undefined)   deformer.weights = [];
            if(deformer.boneNames == undefined) deformer.boneNames = [];
            if(deformer.blendWeights == undefined) deformer.blendWeights = [];

            deformer.deformType = DeformType.Blend;
            deformer.weights.push(weights[i]);
            deformer.boneNames.push(boneName);
            deformer.blendWeights.push(blendWeights[weightIndex]);
        }
    }


    /**  */
    createDeformers(vertexCount) {
        const result = new Array(vertexCount);

        for(let i=0; i<vertexCount; ++i) { // Deformer 는 FBXMesh.vertices 의 갯수만큼 필요하다.
            result[i] = new Deformer();    // 각 Deformer 들은 FBXMesh.vertices[i] 위치에 있는 polygon vertex 를 변형시키는데 사용된다.
        }
        
        if(this.skinningType == "Linear" || this.skinningType == "Rigid") {
            this.clusters.forEach(cluster => cluster.linear(result));                          
            result.forEach(deformer => deformer.weights = new Float32Array(deformer.weights));
        }
        else if(this.skinningType == "DualQuaternion") {
            this.clusters.forEach(cluster => cluster.dualQuaternion(result));                          
            result.forEach(deformer => deformer.weights = new Float32Array(deformer.weights));
        }
        else if(this.skinningType == "Blend") {
            this.clusters.forEach(cluster => cluster.blend(result, this));
            result.forEach(deformer => {
                deformer.weights      = new Float32Array(deformer.weights);
                deformer.blendWeights = new Float32Array(deformer.blendWeights);
            });
        }

        return result;
    }
};


/** AnimationStack 노드를 파싱한 결과를 담습니다. */
export class FBXAnimStack {
    animationName;
    localStart; localStop;
    referenceStart; referenceStop;

    animLayers     = [];
    animCurveNodes = [];
    animCurves     = [];


    ///////////////////////////
    // Instance methods      //
    ///////////////////////////


    /** AnimationStack 노드를 읽고 FBXAnimStack 을 초기화합니다.  */
    constructor(animStack) {
        this.animationName = animStack.properties[1].data.replace("\x00\x01AnimStack", "");

        this.localStart     = this.localStop     = 0;
        this.referenceStart = this.referenceStop = 0;

        animStack.forEach(node => {
            if(node.name == "P") {
                const propName = node.properties[0].data;

                if(propName == "LocalStart")     { this.localStart = Number(node.properties[4].data) * KTIME2SEC; return; }
                if(propName == "LocalStop")      { this.localStop = Number(node.properties[4].data) * KTIME2SEC; return; }
                if(propName == "ReferenceStart") { this.referenceStart = Number(node.properties[4].data) * KTIME2SEC; return; }
                if(propName == "ReferenceStop")  { this.referenceStop = Number(node.properties[4].data) * KTIME2SEC; return; }
            }
        });
    }

    /** FBXAnimStack 을 나타내는 string 을 얻습니다. */
    toString() {
        let ret = `animationName : ${this.animationName}\n`;
        ret += `duration      : ${this.localStop - this.localStart}\n`;
        return ret;
    }

    /** FBXAnimStack 을 AnimationState 로 변환한 결과를 돌려줍니다. */
    createAnimationState(gameObject) {
        const state = new AnimationState(this.animationName, this.localStop - this.localStart);
        const mesh  = gameObject.renderer.mesh;

        this.animLayers.forEach(layer => {
            layer.animCurveNodes.forEach(animCurveNode => {
                const prop = animCurveNode.createAnimatedProperty();
                
                if(prop) {
                    const bone = mesh.getBone(animCurveNode.bone.transform.name);

                    prop.layerName = layer.name;
                    state.addProperty(bone, prop);
                }
            });
        });
        return state;
    }
};


/** AnimationLayer 노드를 파싱한 결과를 담습니다. */
export class FBXAnimLayer {
    name;
    animCurveNodes;


    /** AnimationLayer 를 읽고 FBXAnimLayer 를 초기화합니다. 또한 animLayer.animLayer = this 로 설정됩니다. */
    constructor(animLayer) {
        this.name = animLayer.properties[1].data.replace("\x00\x01AnimLayer", "");

        this.animCurveNodes = [];
        animLayer.animLayer = this;
    }
};


/** AnimationCurveNode 노드를 파싱한 결과를 담습니다. */
export class FBXAnimCurveNode {
    fbxfile;
    bone;
    propType;
    propName;

    xcurve; xdefault;
    ycurve; ydefault;
    zcurve; zdefault;


    /////////////////////////
    // Instance methods    //
    /////////////////////////


    /** AnimationCurveNode 를 읽고 FBXAnimCurveNode 를 초기화합니다. 또한 animCurveNode.animCurveNode = this 로 설정됩니다. */
    constructor(animCurveNode) {
        this.propName = animCurveNode.properties[1].data.replace("\x00\x01AnimCurveNode", "");
        this.fbxfile  = animCurveNode.fbxfile;

        animCurveNode.forEach(node => {
            if(node.name == "P") {
                const propName = node.properties[0].data;

                if(propName == "d|X") { this.xdefault = node.properties[4].data; return; }
                if(propName == "d|Y") { this.ydefault = node.properties[4].data; return; }
                if(propName == "d|Z") { this.zdefault = node.properties[4].data; return; }
            }
        });

        animCurveNode.animCurveNode = this;
    }


    /** curveName 을 보고, xcurve, ycurve, zcurve 를 설정합니다. */
    setAnimCurve(fbxanimCurve, curveName) {
        
        if(curveName == "d|X") { this.xcurve = fbxanimCurve; return; }
        if(curveName == "d|Y") { this.ycurve = fbxanimCurve; return; }
        if(curveName == "d|Z") { this.zcurve = fbxanimCurve; return; }
    }


    /** FBXAnimCurveNode 를 AnimatedProperty 로 변환한 결과를 돌려줍니다. */
    createAnimatedProperty() {
        
        if(!(this.xcurve && this.ycurve && this.zcurve)) { // 
            return;                                        // 
        }
        const prop      = new AnimatedProperty();
        const curveNode = this;
        const settings  = this.fbxfile.globalSettings;

        prop.xcurve = this.xcurve.createAnimationCurve();
        prop.ycurve = this.ycurve.createAnimationCurve();
        prop.zcurve = this.zcurve.createAnimationCurve();

        prop.xcurve.defaultValue = this.xdefault;
        prop.ycurve.defaultValue = this.ydefault;
        prop.zcurve.defaultValue = this.zdefault;


        // i) PropertyType.LocalScale 인 경우
        if(this.propType == "Lcl Scaling" || this.propName == "S") {
            prop.type       = PropertyType.LocalScale;
            prop.resetValue = this.bone.localScale;

            prop.calculateValue = (x,y,z, out) => {
                const S = out.assign(x,y,z);      // out = S
                curveNode.bone.calculateLocal(S); // out = (Soff * Sp) * S * Sp-1
                return S;
            };
        }

        // ii) PropertyType.LocalRotation 인 경우
        else if(this.propType == "Lcl Rotation" || this.propName == "R") {
            prop.type       = PropertyType.LocalRotation;
            prop.resetValue = this.bone.localRotation;

            prop.calculateValue = (x,y,z, out) => {
                const R = settings.euler(x,y,z, curveNode.bone.rotationOrder, out); // out = R
                curveNode.bone.calculateLocal(null, R);                             // out = (Roff * Rp * Rpre) * R * (Rpost * Rp-1)
                return R;
            };
        }

        // iii) PropertyType.LocalPosition 인 경우
        else if(this.propType == "Lcl Translation" || this.propName == "T") {
            prop.type       = PropertyType.LocalPosition;
            prop.resetValue = this.bone.localPosition;

            prop.calculateValue = (x,y,z, out) => {
                const T = out.assign(x,y,z);
                return settings.toLeftHanded(T); // out = T
            };
        }

        return prop;
    }
};


/** AnimationCurve 노드를 파싱한 결과를 담습니다. */
export class FBXAnimCurve {
    default;
    keyTime;
    keyValueFloat;
    keyAttrFlags;
    keyAttrDataFloat;
    keyAttrRefCount;


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** AnimationCurve 노드를 읽고 FBXAnimCurve 를 초기화합니다. 또한 animCurve.animCurve = this 로 설정됩니다. */
    constructor(animCurve) {

        animCurve.forEach((node) => {
            if(node.name == "Default")          this.default = node.properties[0].data;
            if(node.name == "KeyTime")          this.keyTime = node.properties[0].data;
            if(node.name == "KeyValueFloat")    this.keyValueFloat = node.properties[0].data;
            if(node.name == "KeyAttrFlags")     this.keyAttrFlags = node.properties[0].data;
            if(node.name == "KeyAttrDataFloat") this.keyAttrDataFloat = node.properties[0].data;
            if(node.name == "KeyAttrRefCount")  this.keyAttrRefCount  = node.properties[0].data;
        });
        animCurve.animCurve = this;   
    }


    /** FBXAnimCurve 를 AnimationCurve 로 변환하여 돌려줍니다. */
    createAnimationCurve() {
        let refCount   = this.keyAttrRefCount[0];
        let flagIndex  = 0;
        let dataOffset = 0;

        const keyTimeCount = this.keyTime.length-1;
        const animCurve    = new AnimationCurve();

        for(let i=0; i<keyTimeCount; ++i) {
            const p0   = new Vector2(Number(this.keyTime[i]) * KTIME2SEC, this.keyValueFloat[i]);
            const p1   = new Vector2(Number(this.keyTime[i+1]) * KTIME2SEC, this.keyValueFloat[i+1]);
            const flag = this.keyAttrFlags[flagIndex];
            
            if(refCount-- == 0) {
                refCount    = this.keyAttrRefCount[++flagIndex];
                dataOffset += 4;
            }

            if(flag & InterpolationType.Cubic) {
                let rightSlope     = 0;
                let nextLeftSlope  = 0;
                let rightWeight    = 0.333;
                let nextLeftWeight = 0.333;

                if(flag & WeightedMode.Right) {
                    rightWeight = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.RightWeight];
                }
                if(flag & WeightedMode.NextLeft) {
                    nextLeftWeight = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.NextLeftWeight];
                }

                if(flag & VelocityMode.Right) {
                    const velocity = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.RightVelocity];
                }
                if(flag & VelocityMode.NextLeft) {
                    const velocity = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.NextLeftVelocity];
                }

                if(flag & TangentMode.TCB) {
                    const tension    = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.TCBTension];
                    const continuity = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.TCBContinuity];
                    const bias       = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.TCBBias];
                }
                else if(flag & (TangentMode.Auto | TangentMode.User | TangentMode.GenericBreak)) {
                    rightSlope    = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.RightSlope];
                    nextLeftSlope = this.keyAttrDataFloat[dataOffset + AnimCurveDataIndex.NextLeftSlope];
                }

                const cubic = AnimationCurve.cubicBezier(p0, p1, rightSlope, nextLeftSlope, rightWeight, nextLeftWeight);
                animCurve.append(cubic);
            }
            else if(flag & InterpolationType.Constant) {
                const constant = AnimationCurve.constant(p0, p1);
                animCurve.append(constant);
            }
            else if(flag & InterpolationType.Linear) {
                const linear = AnimationCurve.linear(p0, p1);
                animCurve.append(linear);
            }
        }

        animCurve.defaultValue = this.default;

        return animCurve;
    }
};


/** Material 노드를 파싱한 결과를 담습니다. */
export class FBXMaterial {
    name;
    texture;


    /** Material 노드를 읽고,  */
    constructor(material) {
        this.name = material.properties[1].data.replace("\x00\x01Material", "");
        material.material = this;
    }
    

    /**  */
    createMaterial() {
        const mat = new Material();

        mat.name = this.name;
        
        return mat;
    }
};