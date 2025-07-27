
//
// PMX 2.0, 2.1 File Format Specifications                                : https://gist.github.com/felixjones/f8a06bd48f9da9a4539f
// A better way to approximate SDEf interpolation using blender armatures : https://github.com/powroupi/blender_mmd_tools/issues/162
//

import { FileStream, DataType, TextEncoding } from "./FileStream.js";
import {Vector2, Vector3, Vector4} from "../Core/MyMath.js";
import {Mesh, Vertex, Deformer, DeformType, Bone} from "../Core/Mesh.js";
import { Material, Color } from "../Core/Shader.js";
import * as Shader from "../Core/Shader.js";


/**  */
export class PMXFile {
    #log;

    header;
    vertices;
    faces;
    textures;
    materials;
    bones;


    //////////////////////
    // Private Methods  //
    //////////////////////

    /** PMX 파일을 읽고 파싱합니다. */
    #parsePMX(arrayBuffer) {
        stream = new FileStream(arrayBuffer);
        header = this.header = new PMXHeader();

        this.header.load();

        let vertexCount = stream.read(DataType.Int32); // vertices 배열의 길이를 알기 위해, int32 를 읽는다.
        this.vertices   = new Array(vertexCount);      // VertexData[vertexCount] 공간을 할당한다.
        log += `vertexCount : ${this.vertices.length}\n`;

        for(let i=0; i<vertexCount; ++i) {                     // vertexCount 갯수만큼
            const vertex = this.vertices[i] = new PMXVertex(); // Vertex 를 읽어들인다.
            vertex.load();
        }

        let faceCount = stream.read(DataType.Int32); // faces 배열의 길이를 알기 위해, int32 를 읽는다.
        this.faces    = new Array(faceCount);        // number[faceCount] 공간을 할당한다.
        log += `faceCount   : ${this.faces.length}\n\n`;

        for(let i=0; i<faceCount; ++i) {                             // faceCount 갯수만큼
            this.faces[i] = readIndex(header.vertexIndexSize, true); // face 를 읽어들인다.
        }


        let textureCount = stream.read(DataType.Int32); // textures 배열의 길이를 알기 위해, int32 를 읽는다.
        this.textures    = new Array(textureCount);     // string[textureCount] 공간을 할당한다.
        log += `textureCount : ${this.textures.length}\n`;

        for(let i=0; i<textureCount; ++i) {    // textureCount 갯수만큼
            this.textures[i] = readText();     // texture 이름을 읽어들인다.
            log += `\t- ${this.textures[i]}\n`;
        }


        let materialCount = stream.read(DataType.Int32); // materials 배열의 길이를 알기 위해, int32 를 읽는다.
        this.materials    = new Array(materialCount);    // Material[materialCount] 공간을 할당한다.
        log += `\nmaterialCount : ${this.materials.length}\n`;

        for(let i=0; i<materialCount; ++i) {                   // materialCount 갯수만큼
            const mat = this.materials[i] = new PMXMaterial(); // Material 을 읽어들인다.
            mat.load();
            log += `\t mat${i} = { texture : ${this.textures[mat.textureIndex]}, faceCount : ${mat.faceCount}, triangleCount : ${mat.faceCount/3} }\n`;;
        }

        let boneCount = stream.read(DataType.Int32); // bones 배열의 길이를 알기 위해, int32 를 읽는다.
        this.bones    = new Array(boneCount);        // Bone[bonesCount] 공간을 할당한다.
        log += `\nboneCount : ${this.bones.length}\n`;

        for(let i=0; i<boneCount; ++i) {                // boneCount 갯수만큼
            const bone = this.bones[i] = new PMXBone(); // Bone 을 읽어들인다.
            bone.load();
        }

        const rootBones = [];

        for(let i=0; i<boneCount; ++i) { // 본들의 계층구조를 설정한다. parentBoneIndex == -1 이라면
            const bone = this.bones[i];  // root bone 이라는 의미이다.

            if(bone.parentBoneIndex != -1) {
                const parent = this.bones[bone.parentBoneIndex];
                parent.children.push(bone);
            }
            else {
                rootBones.push(bone);
            }
        }

        for(let i=0; i<rootBones.length; ++i) { // 본들의 계층구조를 log 로 출력.
            const bone = rootBones[i];

            log += `\n"${bone.nameLocal}"\n`;
            log += this.#boneHierarchy(bone);
        }
    }


    /** bone 의 계층구조를 나타내는 string 을 돌려줍니다. */
    #boneHierarchy(bone) {
        let tab0 = "";
        let tab1 = "";
        let ret  = "";

        const dfs = (b) => {
            tab0 += "  |    ";

            for(let i=0; i<b.children.length; ++i) {
                const child = b.children[i];
                tab1 += "  |____";

                ret += tab0 + "\n";
                ret += tab1 + `"${child.nameLocal}"\n`;

                tab1 = tab1.slice(0, tab1.length-7);
                tab1 += "  |    ";

                dfs(child);
                tab1 = tab1.slice(0, tab1.length-7);
            }
            tab0 = tab0.slice(0, tab0.length-7);
        };

        dfs(bone);
        return ret;
    }


    //////////////////////
    // Public Methods   //
    //////////////////////

    
    /** PMX file 을 읽고 파싱합니다. 파싱이 완료되었을 때 oncomplete(file : PMXFile) 이 호출됩니다. */
    read(file, oncomplete=null) {
        file.arrayBuffer().then((arrayBuffer)=>{
            this.#parsePMX(arrayBuffer);

            this.#log = log;
            log       = "";

            if(oncomplete != null) {
                oncomplete(this);
            }
        });
    }


    /** PMXFile 을 나타내는 string 을 돌려줍니다. */
    toString() { return this.#log; }


    /** PMXFile 의 정보를 토대로 Mesh 를 생성합니다. */
    createMesh() {
        const mesh = new Mesh();

        mesh.vertices = new Array(this.vertices.length);
        mesh.indices  = new Int32Array(this.faces.length);
        mesh.bones    = new Map();

        for(let i=0; i<this.vertices.length; ++i) {
            mesh.vertices[i] = this.vertices[i].createVertex(this.bones);
        }
        for(let i=0; i<this.faces.length; ++i) {
            mesh.indices[i] = this.faces[i];
        }

        this.bones.forEach(pmxbone => {
            const bone = new Bone(pmxbone.nameLocal);

            mesh.bones.set(bone.name, bone);
            bone.localPosition = pmxbone.position;
            bone.setBindPose(bone.scale, bone.rotation, bone.position);
        });

        this.bones.forEach(pmxbone => {                     // Bone 들의 계층구조를 설정한다.
            const bone = mesh.bones.get(pmxbone.nameLocal); // 

            for(let i=0; i<pmxbone.children.length; ++i) {
                const child = mesh.bones.get(pmxbone.children[i].nameLocal);
                child.parent = bone;
            }
        });

        return mesh;
    }


    /** PMXFile 의 정보를 토대로 Material 들의 목록을 생성하여 돌려줍니다. */
    createMaterials(textures) {
        const ret = new Array(this.materials.length);

        for(let i=0; i<this.materials.length; ++i) {
            const mat    = ret[i] = new Material(); 
            const pmxmat = this.materials[i];
            const name   = this.textures[pmxmat.textureIndex];
            const index  = textures.findIndex(tex => name.includes(tex.name));

            if(index != -1) {
                mat.mainTex = textures[index];
            }
            if(pmxmat.drawingFlags & MaterialFlagType.LINE_DRAWING) {
                mat.wireFrameMode = true;
            }
            mat.triangleCount = this.materials[i].faceCount / 3;
        }
        return ret;
    }
};


/** PMX 파일의 Header 의 정보를 정의합니다. */
export class PMXHeader {
    signature;    // "PMX " [0x50, 0x4D, 0x58, 0x20]
    version;      // 2.0, 2.1
    globalsCount; // Fixed at 8 for PMX 2.0

    textEncoding;        // byte encoding for the "text" type, 0 = UTF16LE, 1 = UTF8
    additionalVec4Count; // Additional vec4 values are added to each vertex
    vertexIndexSize;     // The index type for vertices
    textureIndexSize;    // The index type for textures
    materialIndexSize;   // The index type for materials
    boneIndexSize;       // The index type for bones
    morphIndexSize;      // The index type for morphs
    rigidbodyIndexSize;  // The index type for rigid bodies

    modelNameLocal;  // Name of model (Usually in Japanese)
    modelNameGlobal; // Name of model (Usually in English)
    commentsLocal;   // Additional information (license, Usually in japanese)
    commentsGlobal;  // Additional information (license, Ususally in English)


    /** PMX Header 를 로드합니다. */
    load() {
        this.signature = stream.readString(TextEncoding.Utf8, 4);

        if(this.signature.includes("PMX") == false) {
            throw "file extensions is not PMX!";
        }

        this.version      = stream.read(DataType.Float);
        this.globalsCount = stream.read(DataType.Uint8);

        this.textEncoding        = stream.read(DataType.Uint8);
        this.additionalVec4Count = stream.read(DataType.Uint8);
        this.vertexIndexSize     = stream.read(DataType.Uint8);
        this.textureIndexSize    = stream.read(DataType.Uint8);
        this.materialIndexSize   = stream.read(DataType.Uint8);
        this.boneIndexSize       = stream.read(DataType.Uint8);
        this.morphIndexSize      = stream.read(DataType.Uint8);
        this.rigidbodyIndexSize  = stream.read(DataType.Uint8);

        textEncoding = (this.textEncoding == 0) ? TextEncoding.Utf16le : TextEncoding.Utf8;

        this.modelNameLocal  = readText(stream);
        this.modelNameGlobal = readText(stream);
        this.commentsLocal   = readText(stream);
        this.commentsGlobal  = readText(stream);

        log  = `Signature     : ${this.signature}\n`;
        log += `Version       : ${this.version}\n`;
        log += `Globals count : ${this.globalsCount}\n\n`;

        log += `Text encoding           : ${this.textEncoding == 0 ? "UTF16LE" : "UTF8"}\n`;
        log += `Additional vec4 count   : ${this.additionalVec4Count}\n`;
        log += `Vertex index size       : ${this.vertexIndexSize}\n`;
        log += `Texture index size      : ${this.textureIndexSize}\n`;
        log += `Material index size     : ${this.materialIndexSize}\n`;
        log += `Bone index size         : ${this.boneIndexSize}\n`;
        log += `Morph index size        : ${this.morphIndexSize}\n`;
        log += `Rigidbody index size    : ${this.rigidbodyIndexSize}\n\n`;

        log += `Model name local : ${this.modelNameLocal}\n`;
        log += `Model name global : ${this.modelNameGlobal}\n\n`;

        log += `Comments local : ${this.commentsLocal}\n\n`;
        log += `Comments Global : ${this.commentsGlobal}\n\n`;
    }
};


/** PMX 파일에서 사용되는 Vertex 하나의 정보를 정의합니다. */
export class PMXVertex {
    static #loadWeight = [ PMXVertex.#bdef1, PMXVertex.#bdef2, PMXVertex.#bdef4, PMXVertex.#sdef, PMXVertex.#qdef ];

    position; // Vector3, XYZ
    normal;   // Vector3, XYZ
    uv;       // Vector2, XY

    additionalVec4; // Vector4[N], N is defined in the PMXHeader.additionalVertexCount (Can be 0)
                    // Each vertex may gain up to 4 additional vec4 values as defined in the Globals list in the header. Usage tends to vary as most
                    // applications will simply pass the values to a vertex shader and let the shader decide the usage.

    weightType; // int8, 0 = BDEF1, 1 = BDEF2, 2 = BDEF4, 3 = SDEF, 4 = QDEF
    weight;     // Each vertex can be tied and weighted to bones based on the Bone Index. A single vertex can be tied to a maximum of 4 bones.
                // There are multiple types of deforms, each one varies in length and usage. The bone index of -1 is a nil value, the bone should be ignored.

    edgeScale; // float, Pencil-outline scale (1.0 should be around 1 pixel)


    ///////////////////////////
    // Static methods        //
    ///////////////////////////


    /** weightType == BDEF1 (Version 2.0) */
    static #bdef1() {
        return { 
            index : readIndex(header.boneIndexSize), // Bone Index (Weight = 1.0)

            createDeformer : function(pmxbones) {
                const deformer = new Deformer();
                
                deformer.deformType = DeformType.Linear;
                deformer.weights    = new Float32Array([1]);

                deformer.boneNames = [
                    pmxbones[this.index].nameLocal
                ];
                return deformer;
            }
        }; 
    }

    /** weightType == BDEF2 (Version 2.0) */
    static #bdef2() {
        const ret = {
            index1  : readIndex(header.boneIndexSize), // Bone index 1
            index2  : readIndex(header.boneIndexSize), // Bone index 2
            weight1 : stream.read(DataType.Float),     // Bone 1 weight (Bone 2 weight = 1.0 - Bone 1 weight)

            createDeformer : function(pmxbones) {
                const deformer = new Deformer();

                deformer.deformType = DeformType.Linear;
                deformer.weights    = new Float32Array([this.weight1, 1-this.weight1]);

                deformer.boneNames = [
                    pmxbones[this.index1].nameLocal,
                    pmxbones[this.index2].nameLocal
                ];
                return deformer;
            }
        };
        return ret;
    }


    /** weightType == BDEF4 (Version 2.0) */
    static #bdef4() {
        const ret = {
            index1  : readIndex(header.boneIndexSize), // Bone index 1
            index2  : readIndex(header.boneIndexSize), // Bone index 2
            index3  : readIndex(header.boneIndexSize), // Bone index 3
            index4  : readIndex(header.boneIndexSize), // Bone index 4
            weight1 : stream.read(DataType.Float),     // Bone 1 weight (Weight total not guaranteed to be 1.0)
            weight2 : stream.read(DataType.Float),     // Bone 2 weight (Weight total not guaranteed to be 1.0)
            weight3 : stream.read(DataType.Float),     // Bone 3 weight (Weight total not guaranteed to be 1.0)
            weight4 : stream.read(DataType.Float),     // Bone 4 weight (Weight total not guaranteed to be 1.0)

            createDeformer(pmxbones) {
                const deformer = new Deformer();

                deformer.deformType = DeformType.Linear;
                deformer.weights    = new Float32Array([this.weight1, this.weight2, this.weight3, this.weight4]);

                deformer.boneNames = [
                    pmxbones[this.index1].nameLocal,
                    pmxbones[this.index2].nameLocal,
                    pmxbones[this.index3].nameLocal,
                    pmxbones[this.index4].nameLocal
                ];
                return deformer;
            }
        };
        return ret;
    }


    /** weightType == SDEF (Spherical deform blending) */
    static #sdef() {
        const ret = {
            index1  : readIndex(header.boneIndexSize), // Bone index 1
            index2  : readIndex(header.boneIndexSize), // Bone index 2
            weight1 : stream.read(DataType.Float),     // Bone 1 weight (Bone 2 weight = 1.0 - Bone 1 weight)

            c  : stream.read(DataType.Vec3f), // Rotation center
            r0 : stream.read(DataType.Vec3f), // Point located opposite from  B with C as its center of reflection
            r1 : stream.read(DataType.Vec3f), // Point located opposite from R0 with B as its center of reflection

            createDeformer(pmxbones) {
                const deformer = new Deformer();

                deformer.deformType = DeformType.Spherical;
                deformer.weights    = new Float32Array([this.weight1, 1-this.weight1]);

                deformer.boneNames = [
                    pmxbones[this.index1].nameLocal,
                    pmxbones[this.index2].nameLocal
                ];
                return deformer;
            }
        };
        return ret;
    }


    /** weightType == QDEF (Dual quaternion deform blending) */
    static #qdef() {
        const ret = {
            index1  : readIndex(header.boneIndexSize), // Bone index 1
            index2  : readIndex(header.boneIndexSize), // Bone index 2
            index3  : readIndex(header.boneIndexSize), // Bone index 3
            index4  : readIndex(header.boneIndexSize), // Bone index 4
            weight1 : stream.read(DataType.Float),     // Bone 1 weight (Weight total not guaranteed to be 1.0)
            weight2 : stream.read(DataType.Float),     // Bone 2 weight (Weight total not guaranteed to be 1.0)
            weight3 : stream.read(DataType.Float),     // Bone 3 weight (Weight total not guaranteed to be 1.0)
            weight4 : stream.read(DataType.Float),     // Bone 4 weight (Weight total not guaranteed to be 1.0)

            createDeformer(pmxbones) {
                const deformer = new Deformer();

                deformer.deformType = DeformType.DualQuaternion;
                deformer.weights    = new Float32Array([this.weight1, this.weight2, this.weight3, this.weight4]);

                deformer.boneNames = [
                    pmxbones[this.index1].nameLocal,
                    pmxbones[this.index2].nameLocal,
                    pmxbones[this.index3].nameLocal,
                    pmxbones[this.index4].nameLocal
                ];
                return deformer;
            }
        };
        return ret;
    }


    /////////////////////////
    // Instance methods    //
    /////////////////////////


    /** Vertex 하나의 정보를 로드합니다. */
    load() {
        this.position = stream.read(DataType.Vec3f);
        this.normal   = stream.read(DataType.Vec3f);
        this.uv       = stream.read(DataType.Vec2f);

        if(header.additionalVec4Count > 0) {                             // additionalVec4 가 존재한다면
            this.additionalVec4 = new Array(header.additionalVec4Count); // additionalVec4Count 만큼 Vector4 를 읽어들인다.

            for(let i=0; i<header.additionalVec4Count; ++i) {
                this.additionalVec4[i] = stream.read(DataType.Vec4f);
            }
        }

        this.weightType = stream.read(DataType.Uint8);
        this.weight     = PMXVertex.#loadWeight[this.weightType]();
        this.edgeScale  = stream.read(DataType.Float);
    }


    /** PMXVertex 를 Vertex 로 변환합니다. */
    createVertex(pmxbones) {
        const vertex = new Vertex(
            this.position.toVector4(),
            this.uv
        );
        vertex.deformer = this.weight.createDeformer(pmxbones);
        vertex.normal   = this.normal;
        
        return vertex;
    }
};


/** PMX 파일에서 사용되는 Material 하나의 정보를 정의합니다. */
export class PMXMaterial {
    nameLocal;            // string, Handy name for the material (Usually Japanese)
    nameGlobal;           // string, Handy name for the material (Usually English)
    diffuseColour;        // Vector4, RGBA colour (Alpha will set a semi-transparent material)
    specularColour;       // Vector3, RGB colour of the reflected light
    specularStrength;     // float, The "size" of the specular highlight
    ambientColour;        // Vector3, RGB colour of the material shadow (When out of light)
    drawingFlags;         // int8, See Material Flags
    edgeColour;           // Vector4, RGBA colour of the pencil-outline edge (Alpha for semi-transparent)
    edgeScale;            // float, Pencil-outline scale (1.0 should be around 1 pixel)
    textureIndex;         // index, See Index Types, this is from the texture table by default
    environmentIndex;     // index, Same as texture index, but for environment mapping
    environmentBlendMode; // int8, 0 = disabled, 1 = multiply, 2 = additive, 3 = additional vec4*
    toonReference;        // int8, 0 = Texture reference, 1 = internal reference
    toonValue;            // index/int8, Behaviour depends on Toon reference value**
    metaData;             // string, This is used for scripting or additional data
    faceCount;            // int32, How many surfaces this material affects***

    /** Material 하나의 정보를 로드합니다. */
    load() {
        this.nameLocal            = readText();
        this.nameGlobal           = readText();
        this.diffuseColour        = stream.read(DataType.Vec4f); 
        this.specularColour       = stream.read(DataType.Vec3f);
        this.specularStrength     = stream.read(DataType.Float);
        this.ambientColour        = stream.read(DataType.Vec3f);
        this.drawingFlags         = stream.read(DataType.Uint8);
        this.edgeColour           = stream.read(DataType.Vec4f);
        this.edgeScale            = stream.read(DataType.Float);
        this.textureIndex         = readIndex(header.textureIndexSize);
        this.environmentIndex     = readIndex(header.textureIndexSize);
        this.environmentBlendMode = stream.read(DataType.Uint8);
        this.toonReference        = stream.read(DataType.Uint8);

        if(this.toonReference == 0) {
            this.toonValue = readIndex(header.textureIndexSize);
        }
        else {
            this.toonValue = stream.read(DataType.Uint8);
        }

        this.metaData  = readText();
        this.faceCount = stream.read(DataType.Int32);
    }
};


/** PMX 파일에서 사용되는 Bone 하나의 정보를 정의합니다. */
export class PMXBone {
    nameLocal;       // string, Handy name for the bone (Usually Japanese)
    nameGlobal;      // string, Handy name for the bone (Usually English)
    position;        // Vector3, The local translation of the bone
    parentBoneIndex; // Index
    layer;           // int32, Deformation hierarchy
    boneFlags;       // int16, Bone Flags
    tailPosition;    // Vector3/Index, If indexed tail position flag is set then this is a bone index
    inheritBone;     // ~, Used if either of the inherit flags are set. 
    fixedAxis;       // ~, Used if fixed axis flag is set.
    localCoordinate; // ~, Used if local co-ordinate flag is set.
    externalParent;  // ~, Used if external parent deform flag is set.
    boneIK;          // ~, Used if IK flaG is set. See Bone IK


    /** 자식 본들의 목록을 나타내는 PMXBone[] */
    children;


    /** Bone 하나를 읽어들입니다.*/
    load() {
        this.nameLocal       = readText();
        this.nameGlobal      = readText();
        this.position        = stream.read(DataType.Vec3f);
        this.parentBoneIndex = readIndex(header.boneIndexSize);
        this.layer           = stream.read(DataType.Int32);
        this.boneFlags       = stream.read(DataType.Int16);

        this.children = [];


        // INDEXED_TAIL_POSITION 이 세팅되어 있다면 tailPosition 은 Bone index 가 되지만,
        // INDEXED_TAIL_POSITION 이 세팅되어 있지 않다면 tailPosition 은 Vector3 가 된다.
        if(this.boneFlags & BoneFlagType.INDEXED_TAIL_POSITION) { 
            this.tailPosition = readIndex(header.boneIndexSize); 
        }
        else {
            this.tailPosition = stream.read(DataType.Vec3f);
        }

        // INHERIT_ROTATION, INHERIT_TRANSLATION 중 하나라도 켜져있다면, parentIndex, parentInfluence 가 주어진다.
        if(this.boneFlags & (BoneFlagType.INHERIT_ROTATION | BoneFlagType.INHERIT_TRANSLATION) ) { 
            this.inheritBone = {
                parentIndex     : readIndex(header.boneIndexSize), // Bone index.
                parentInfluence : stream.read(DataType.Float)      // float, Weight of how much influence this parent has on this bone
            };
        }


        // FIXED_AXIS 플래그가 켜져있다면, fixedAxis 가 주어진다.
        if(this.boneFlags & BoneFlagType.FIXED_AXIS) {                                       
            this.fixedAxis = stream.read(DataType.Vec3f); // Vector3, Direction this bone points
        }


        // LOCAL_COORDINATE 플래그가 켜져있다면, localCoordinate 가 주어진다.
        if(this.boneFlags & BoneFlagType.LOCAL_COORDINATE) { 

            this.localCoordinate = {
                xAxis : stream.read(DataType.Vec3f), // Vector3, ???
                zAxis : stream.read(DataType.Vec3f)  // Vector3, ???
            };
        }

        // EXTERNAL_PARENT_DEFORM 플래그가 켜져있다면, externalParent 라는 Index 가 주어진다.
        if(this.boneFlags & BoneFlagType.EXTERNAL_PARENT_DEFORM) { 
            this.externalParent = readIndex(header.boneIndexSize); // Bone index.
        }


        // IK 플래그가 켜져있다면, boneIK 가 주어진다.
        if(this.boneFlags & BoneFlagType.IK) {
            const boneIK = this.boneIK = {
                targetIndex : readIndex(header.boneIndexSize), // Bone index
                loopCount   : stream.read(DataType.Int32),     // ???
                limitRadian : stream.read(DataType.Float),     // ???
                linkCount   : stream.read(DataType.Int32),     // int32, How many bones this IK links with
                ikLinks     : null                             // ikLink[N] (N = linkCount)
            };

            if(boneIK.linkCount > 0) {                                        // link 가 존재한다면,
                const ikLinks = boneIK.ikLinks = new Array(boneIK.linkCount); // ikLink[linkCount] 공간을 할당한다.

                for(let i=0; i<boneIK.linkCount; ++i) {
                    const links = ikLinks[i] = {
                        boneIndex     : readIndex(header.boneIndexSize), // Bone index
                        hasLimits     : stream.read(DataType.Int8),      // When equal to 1, use angle limits
                        ikAngleLimits : null                             // Used if has limits is 1. 
                    };

                    // hasLimits 이 true 라면, ikAngleLimits 가 주어진다.
                    if(links.hasLimits == 1) {  
                        links.ikAngleLimits = { 
                            limitMin : stream.read(DataType.Vec3f), // Minimum angle (radians)
                            limitMax : stream.read(DataType.Vec3f)  // Maximum angle (radians)
                        };
                    }
                }
            }
        }

        if(this.nameLocal.length == 0)  this.nameLocal  = `unnamed ${unnamedId++}`; // 이름이 없는 본들에 대해서,
        if(this.nameGlobal.length == 0) this.nameGlobal = `unnamed ${unnamedId++}`; // unnamed 라는 고유한 이름을 부여한다.
    }
};


/** PMX 파일에서 사용되는 Morph 하나의 정보를 정의합니다. */
export class PMXMorph {

};


/**  */
export const WeightType = {
    BDEF1 : 0,
    BDEF2 : 1,
    BDEF4 : 2,
    SDEF  : 3,
    QDEF  : 4
};


/**  */
export const BoneFlagType = {
    INDEXED_TAIL_POSITION  : (1 << 0),  // Is the tail position a vec3 or bone index
    ROTATABLE              : (1 << 1),  // Enables rotation
    TRANSLATABLE           : (1 << 2),  // Enables translation (shear)
    IS_VISIBLE             : (1 << 3),  // ???
    ENABLED                : (1 << 4),  // ???
    IK                     : (1 << 5),  // Use Inverse kinematics (physics)
    INHERIT_ROTATION       : (1 << 8),  // Rotation inherits from another bone
    INHERIT_TRANSLATION    : (1 << 9),  // Translation inherits from another bone
    FIXED_AXIS             : (1 << 10), // The bone's shaft is fixed in a direction
    LOCAL_COORDINATE       : (1 << 11), // ???
    PHYSICS_AFTER_DEFORM   : (1 << 12), // ???
    EXTERNAL_PARENT_DEFORM : (1 << 13)  // ???
};


/**  */
export const MaterialFlagType = {
    NO_CULL        : (1 << 0), // Disables back-face culling (RendererJS 에서는 해당 플래그는 무시합니다)
    GROUND_SHADOW  : (1 << 1), // Projects a shadow onto the geometry
    DRAW_SHADOW    : (1 << 2), // Renders to the shadow map
    RECEIVE_SHADOW : (1 << 3), // Receives a shadow from the shadow map
    HAD_EDGE       : (1 << 4), // Has "pencil" outline
    VERTEX_COLOUR  : (1 << 5), // Uses additional vec4 1 for vertex colour
    POINT_DRAWING  : (1 << 6), // Each of the 3 vertices are points
    LINE_DRAWING   : (1 << 7)  // The triangle is rendered as lines
};


/**  */
function readText() {
    const length = stream.read(DataType.Uint32);
    return stream.readString(textEncoding, length);
}

/**  */
function readIndex(indexSize, vertexIndex=false) {

    if(vertexIndex) {
        if(indexSize == 1) return stream.read(DataType.Uint8);  // 다른 index 값들과 달리 vertexIndex 만
        if(indexSize == 2) return stream.read(DataType.Uint16); // Uint8, Uint16 을 사용하며, Nil 값(-1)이 존재하지 않는다.
        return stream.read(DataType.Int32);
    }

    if(indexSize == 1) return stream.read(DataType.Int8);
    if(indexSize == 2) return stream.read(DataType.Int16);

    return stream.read(DataType.Int32);
}


let log          = "";
let textEncoding = 0;
let header       = null;
let stream       = null;
let unnamedId    = 0;