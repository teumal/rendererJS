
import {Vector2,Vector3,Vector4,Matrix4x4,Quaternion, DualQuaternion, RotationOrder} from "./MyMath.js";
import { Renderer } from "./Renderer.js";
import { Transform } from "./Transform.js";
import { GameEngine } from "./GameEngine.js";


/** Deformer.deformPosition() 에서 사용할 skinning method 를 명시합니다. */
export const DeformType = {
    Linear         : 0,
    DualQuaternion : 1,
    Blend          : 2,
    Spherical      : 3,
};


/** 정점 하나가 가져야할 정보들을 정의합니다.*/
export class Vertex {

    /** 정점의 위치를 나타내는 Vector4 */
    position;


    /** 정점의 UV 좌표를 나타내는 Vector2 */
    uv;


    /** 정점의 법선벡터(normal)을 나타내는 Vector3 */
    normal;


    /** 정점을 변형시키기 위한 Deformer. */
    deformer;


    //////////////////////////
    // Public Methods       //
    //////////////////////////


    /** Vertex 를 생성합니다. */
    constructor(position=new Vector4(), uv=new Vector2()) {
        this.position = position;
        this.uv       = uv;
        this.deformer = null;
    }


    /** vertex 의 position, uv 값을 복사해옵니다. */
    assign(vertex) {
        this.position.assign(vertex.position);
        this.uv.assign(vertex.uv);
        this.normal = vertex.normal;
    }
};


/** 본을 나타내는 Transform 을 정의합니다.  */
export class Bone extends Transform {
    static #renderer = null;

    #frameNumber = 0;
    #invBindPose = new Transform("BindPose-1");
    #skinning    = new Transform("Skinning");


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** Skinning 트랜스폼을 계산합니다. */
    #calculateSkinning() {
        const frameNumber = GameEngine.frameNumber;

        if(this.#frameNumber != frameNumber) {
            this.#invBindPose.mulTransform(this, this.#skinning);
            this.#frameNumber = frameNumber;
        }
    }


    /** Bone 을 나타내는 string 을 돌려줍니다. */
    toString(toEuler=false, rotationOrder=RotationOrder.EulerYXZ) {
        const bindPose = this.getBindPose();

        const a = super.toString(toEuler, rotationOrder);
        const b = bindPose.toString(toEuler, rotationOrder);
        return a + b;
    }


    /** 바인딩 포즈(bindPose)를 설정합니다. */
    setBindPose(scale, rotation, position) {

        if(scale instanceof Matrix4x4) {
            scale = new Transform("BindPose", scale);
        }
        if(scale instanceof Transform) {
            const transform = scale;

            scale    = transform.scale;
            rotation = transform.rotation;
            position = transform.position;
        }

        this.#invBindPose.setWorldTransform(scale, rotation, position);
        this.#invBindPose.inverse(this.#invBindPose);
    }


    /** 바인딩 포즈(bindPose)를 나타내는 Transform 을 얻습니다. 항상 복사본을 돌려줍니다. */
    getBindPose(out=new Transform()) { 
        this.#invBindPose.inverse(out); 
        out.name = "BindPose";
        return out;
    }


    /** 본의 스키닝 행렬(skinning matrix)을 나타내는 Matrix4x4 를 돌려줍니다.  */
    skinning() { 
        this.#calculateSkinning();
        return this.#skinning.TRS(); 
    }


    /** 본의 스키닝 행렬(skinning matrix)를 나타내는 DualQuaternion 을 돌려줍니다. */
    skinningDQ() { 
        this.#calculateSkinning();
        return this.#skinning.toDualQuaternion(); 
    }


    ////////////////////////
    // Static methods     //
    ////////////////////////


    /** Bone 을 그리기 위한 Mesh 를 생성합니다. */
    static createMesh() {
        const mesh = new Mesh();

        mesh.vertices = [
            new Vertex(new Vector4(0,0,0)),         // 0
            new Vertex(new Vector4(-0.1,0.1,-0.1)), // 1
            new Vertex(new Vector4(-0.1,0.1,0.1)),  // 2
            new Vertex(new Vector4(0.1,0.1,0.1)),   // 3
            new Vertex(new Vector4(0.1,0.1,-0.1)),  // 4
            new Vertex(new Vector4(0,1,0)),         // 5
        ];
        mesh.indices = [
            0,1,4, 2,1,0, 3,2,0, 4,3,0,
            1,5,4, 4,5,3, 3,5,2, 2,5,1
        ];
        return mesh;
    }


    /** Bone 을 그리기 위한 Renderer 를 얻습니다. */
    static get renderer() {

        if(Bone.#renderer == null) {                          // Bone.#renderer 가 할당되지 않았다면
            const renderer = Bone.#renderer = new Renderer(); // Renderer, Mesh 를 생성한다.
            renderer.mesh  = Bone.createMesh();
            renderer.material.wireFrameMode = true;
            renderer.material.zTest         = false;
        }
        return Bone.#renderer;
    }
};


/** 캐릭터 피부(Skin)를 변형시키기 위한 정보들을 정의합니다. */
export class Deformer {
    static #temp0 = new Vector4();
    static #temp1 = new DualQuaternion();
    static #temp2 = new DualQuaternion();

    #frameNumber = 0;
    #position    = new Vector4();


    /** 정점을 변형시키기 위해 사용할 skinning method 를 명시하는 DeformType 열거형 */
    deformType = DeformType.Linear;


    /** 가중치들의 목록을 나타내는 Float32Array 또는 number[]. */
    weights;


    /** 영향을 주는 본들의 이름들을 나타내는 string[]. */
    boneNames;


    /**  */
    blendWeights;


    /////////////////////////
    // Instance methods    //
    /////////////////////////


    /** Linear blend skinning 을 사용하여 vertex.position 을 변형시킵니다:
     * 
     *  M_blend = (w_0 · M_0) + (w_1 · M_1) + ... + (w_N · M_N)
     * 
     *  #position = (M_blend · vertex.position) */
    #linear(vertex, bones) {
        const position  = vertex.position;
        const boneCount = this.boneNames.length;

        const temp  = Deformer.#temp0;
        const cache = this.#position;

        {
            const M_0 = bones.get(this.boneNames[0]).skinning(); // 불필요한 초기화를 피하기 위해, cache 는
            const w_0 = this.weights[0];                         // 0 번째 본의 스키닝 연산으로 초기화한다:
            M_0.mulVector(position, cache);                      // cache = (w_0 · M_0 · position)

            cache.x *= w_0;
            cache.y *= w_0;
            cache.z *= w_0;
            cache.w  = w_0;
        }

        for(let i=1; i<boneCount; ++i) {                         // 계산량을 줄이기 위해, (M_blend · p) 대신 다음처럼 계산한다:
            const M_i = bones.get(this.boneNames[i]).skinning(); // (w_0 · M_0 · p) + (w_1 · M_1 · p) + ... + (w_N · M_N · p)
            const w_i = this.weights[i];

            M_i.mulVector(position, temp); // temp = (M_i · position)
            cache.x += w_i * temp.x;       // cache += w_i · (M_i · position)
            cache.y += w_i * temp.y;
            cache.z += w_i * temp.z;
            cache.w += w_i;
        }
    }


    /** DLB (Dual quaternion Linear Blending) 을 사용하여 vertex.position 을 변형시킵니다:
     * 
     *  dq_blend = (w_0 · dq_0) + (w_1 · dq_1) + ... + (w_N · dq_N)
     * 
     *  dq_blend /= |dq_blend|
     * 
     *  #position = (dq_blend · vertex.position · dq_blend*) */
    #dualQuaternion(vertex, bones) {
        const position  = vertex.position;
        const boneCount = this.boneNames.length;

        const cache    = this.#position;
        const temp     = Deformer.#temp1;
        const dq_blend = Deformer.#temp2;

        const dq_0 = bones.get(this.boneNames[0]).skinningDQ(); // 불필요한 초기화를 피하기 위해, dq_blend 는
        const w_0  = this.weights[0];                           // 0 번째 본의 스키닝 연산으로 초기화해준다:
        dq_0.mulScalar(w_0, dq_blend);                          // dq_blend = (w_0 · dq_0)
        cache.w = w_0;

        for(let i=1; i<boneCount; ++i) {
            const dq_i = bones.get(this.boneNames[i]).skinningDQ();
            const w_i  = this.weights[i];

            dq_i.mulScalar(w_i, temp);    // temp = (w_i · dq_i)
            dq_i.add(dq_blend, dq_blend); // dq_blend += (w_i · dq_i)
            cache.w += w_i;
        }

        dq_blend.normalize(dq_blend);                 // dq_blend /= |dq_blend|
        dq_blend.mulVector(position, this.#position); // #position = (dq_blend · position · dq_blend*)
    }


    /** Linear blend skinning 과 DLB 방식을 섞어서 vertex.position 을 변형시킵니다. */
    #blend(vertex, bones) {
        this.#linear(vertex, bones);
    }


    /**  */
    #spherical(vertex, bones) {

    }


    /** vertex.position 을 deformType 으로 명시한 skinning method 로 변형시킵니다.
     * 
     *  결과는 변형된 vertex.position 을 나타내는 Vector4 입니다. 계산량을 줄이기 위해 항상 Deformer 는
     * 
     *  내부적으로 cache 를 유지하며, deformPosition() 은 항상 cache 의 참조를 돌려줍니다. 읽기 전용(read-only)
     * 
     *  이며, 값을 수정해야 한다면 deformPosition().clone() 처럼 사용하시길 바랍니다. */
    deformPosition(vertex, bones) {
        const frameNumber = GameEngine.frameNumber;

        if(this.boneNames == undefined) { // 영향을 받는 본이 없다면, 
            return vertex.position;       // vertex.position 을 그대로 돌려준다.
        }
        if(this.#frameNumber == frameNumber) { // #position 는 매 프레임 진입 시마다 재계산되며,
            return this.#position;             // 계산된 프레임이 끝날 때까지 유효하다.
        }
        switch(this.deformType) {
            case DeformType.Linear:         { this.#linear(vertex, bones); break; }
            case DeformType.DualQuaternion: { this.#dualQuaternion(vertex, bones); break; }
            case DeformType.Blend:          { this.#blend(vertex, bones); break; }
            case DeformType.Spherical:      { this.#spherical(vertex, bones); break; }
        };
        if(this.#position.w != 1) {                                       // #position.w == 1 이 아니라면, w 값으로 각 성분들을 
            this.#position.mulScalar(1/this.#position.w, this.#position); // 나누어주는 것으로 정규화(normalize)시킨다.
        }

        this.#frameNumber = frameNumber;
        return this.#position;
    }
};



/** vertex0-vertex1-vertex2 로 구성되는 삼각형 하나를 정의합니다. 
 * 
 *  Vertex 들의 뷰(view)이기에, 항상 얕은 복사(shallow copy)를 사용하며 참조(Reference)만을 붙들고 있습니다. */
export class Triangle { 
    static #temp0 = new Vector4();
    static #temp1 = new Vector4();

    vertex0; vertex1; vertex2;


    ///////////////////////////
    // Instance methods      //
    ///////////////////////////


    /** vertex0, vertex1, vertex2 로 구성된 삼각형을 생성합니다. */
    constructor(vertex0, vertex1, vertex2) {
        this.vertex0 = vertex0;
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
    }


    /** Triangle 을 나타내는 string 을 돌려줍니다. clipCoordinate=true 라면, 정점들의 위치를 clip => NDC => viewport 로 변환한 결과 또한 보여줍니다. 
     *  
     *  viewport 로 변환하기 위해, Renderer.camera 에 설정된 Camera 를 사용합니다. */
    toString(clipCoordinate=false) {
        let ret = "\n";

        if(clipCoordinate) {
            const camera = Renderer.camera;

            const clipPos0 = this.vertex0.position;
            const clipPos1 = this.vertex1.position;
            const clipPos2 = this.vertex2.position;

            const ndcPos0 = camera.clipToNDC(clipPos0);
            const ndcPos1 = camera.clipToNDC(clipPos1);
            const ndcPos2 = camera.clipToNDC(clipPos2);

            const viewport0 = camera.ndcToViewport(ndcPos0);
            const viewport1 = camera.ndcToViewport(ndcPos1);
            const viewport2 = camera.ndcToViewport(ndcPos2);
            
            const p0p1 = Vector3.sub(ndcPos1, ndcPos0); // p0p1 = p1 - p0
            const p0p2 = Vector3.sub(ndcPos2, ndcPos0); // p0p2 = p2 - p0

            const normalNDC = Vector3.cross(p0p1, p0p2).normalized;

            ret += `vertex0 : \n\tposition (clip)     : ${clipPos0}\n\tposition (NDC)      : ${ndcPos0}\n\tposition (viewport) : ${viewport0}\n\tuv                  : ${this.vertex0.uv}\n\n`;
            ret += `vertex1 : \n\tposition (clip)     : ${clipPos1}\n\tposition (NDC)      : ${ndcPos1}\n\tposition (viewport) : ${viewport1}\n\tuv                  : ${this.vertex1.uv}\n\n`;
            ret += `vertex2 : \n\tposition (clip)     : ${clipPos2}\n\tposition (NDC)      : ${ndcPos2}\n\tposition (viewport) : ${viewport2}\n\tuv                  : ${this.vertex2.uv}\n\n`;
            ret += `normal (clip) : ${this.normal()}\nnormal (ndc)  : ${normalNDC}`;
        }
        else {
            ret += `vertex0 : \n\tposition : ${this.vertex0.position}\n\tuv     : ${this.vertex0.uv}\n\n`;
            ret += `vertex1 : \n\tposition : ${this.vertex1.position}\n\tuv     : ${this.vertex1.uv}\n\n`;
            ret += `vertex2 : \n\tposition : ${this.vertex2.position}\n\tuv     : ${this.vertex2.uv}\n\n`;
            ret += `normal  : ${this.normal()}`;
        }

        return ret;
    }


    /** vertex0, vertex1, vertex 의 참조(reference)를 저장합니다. */
    assign(vertex0, vertex1, vertex2) {
        this.vertex0 = vertex0;
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
        return this;
    }


    /** 삼각형의 법선벡터(normal)를 나타내는 Vector3 를 out 에 담아 돌려줍니다. */
    normal(out=new Vector3()) {
        const p0 = this.vertex0.position;
        const p1 = this.vertex1.position;
        const p2 = this.vertex2.position;

        const p0p1 = p1.sub(p0, Triangle.#temp0); // p0p1 = p1 - p0
        const p0p2 = p2.sub(p0, Triangle.#temp1); // p0p2 = p2 - p0

        const cross = Vector3.cross(p0p1, p0p2, out); // out = (p0p1 x p0p2)
        return cross.normalize(cross);                // out = out / |out|
    }


    /** 삼각형이 뒷면(backface)인지를 나타내는 boolean 을 얻습니다. */
    get backface() {
        const p0 = this.vertex0.position;
        const p1 = this.vertex1.position;
        const p2 = this.vertex2.position;

        const w0 = 1/p0.w; // 정점(vertex)들이 클립 좌표(clip coordinate)라면, w 값이 음수일 수 있으므로
        const w1 = 1/p1.w; // NDC 좌표로 바꾸어준다. 클립 좌표(clip coordinate)가 아니라면 w0 = w1 = w2 = 1 이다.
        const w2 = 1/p2.w;

        const p0x = (p0.x * w0), p0y = (p0.y * w0);
        const p1x = (p1.x * w1), p1y = (p1.y * w1);
        const p2x = (p2.x * w2), p2y = (p2.y * w2);

        const x0 = (p1x - p0x), y0 = (p1y - p0y); // p0p1 = p1 - p0
        const x1 = (p2x - p0x), y1 = (p2y - p0y); // p0p2 = p2 - p0

        return (x0*y1 - y0*x1) >= 0; // (p0p1 x p0p2)·(0,0,1) >= 0
    }
};


/**  */
export class Mesh {
    
    /** Vertex의 목록을 나타내는 Vertex[]. */
    vertices;


    /** Index의 목록을 나타내는 Uint32Array 또는 Number[]. 크기는 항상 3의 배수입니다. */
    indices;


    /** Bone 의 목록을 나타내는 Map<string, Bone> */
    bones;


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** index 번째의 삼각형을 out 에 담아 돌려줍니다. out 에 담긴 Vertex 들은 읽기 전용(read-only)입니다. */
    getTriangle(index, out=new Triangle()) {
        index *= 3;

        const index0 = this.indices[index];
        const index1 = this.indices[index+1];
        const index2 = this.indices[index+2];

        return out.assign(
            this.vertices[index0],
            this.vertices[index1],
            this.vertices[index2]
        );
    }


    /** boneName 을 가진 Bone 을 얻습니다. */
    getBone(boneName) { return this.bones.get(boneName); }


    /** 삼각형(Triangle)의 갯수를 얻습니다. 결과는 number 입니다. */
    get triangleCount() { return this.indices.length / 3; }


    /** bones 의 계층구조를 나타내는 string 을 얻습니다. */
    get boneHierarchy() {
        let ret = "";

        this.bones.forEach(bone => {

            if(bone.parent == null) {
                ret += bone.hierarchy;
            }
        });
        return ret;
    }
};


