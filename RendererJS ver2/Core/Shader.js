
import {Vector2,Vector3,Vector4,Quaternion,Matrix4x4} from "./MyMath.js";
import { Texture } from "../Importer/Texture.js";


/** RGBA 색상을 하나 정의합니다. */
export class Color {
    rgba;


    //////////////////////
    // Static methods   //
    //////////////////////


    /** 스칼라 s 를 사용해 선형보간을 수행합니다. 결과는 from·(1-s) + to·s 이며, out 에 담아 돌려줍니다.
     * 
     *  스칼라 s 는 항상 [0, 1] 범위의 값이어야 합니다. */
    static lerp(from, to, s, out=new Color()) {
        const s2 = 1-s;

        const r = Math.floor(from.r * s2 + to.r * s);
        const g = Math.floor(from.g * s2 + to.g * s);
        const b = Math.floor(from.b * s2 + to.b * s);
        const a = Math.floor(from.a * s2 + to.a * s);

        return out.assign(r,g,b,a);
    }


    static get red()   { return new Color(255, 0, 0, 255); }
    static get blue() { return new Color(0, 0, 255, 255); }
    static get black() { return new Color(0, 0, 0, 255); }
    static get clear() { return new Color(0, 0, 0, 0); }
    static get cyan() { return new Color(0, 255, 255, 255); }
    static get gray() { return new Color(127, 127, 127, 255); }
    static get green() { return new Color(0, 255, 0, 255); }
    static get grey() { return new Color(127, 127, 127, 255); }
    static get magenta() { return new Color(255, 0, 255, 255); }
    static get white() { return new Color(255,255,255,255); }
    static get yellow() { return new Color(255, 234, 4, 255); }


    //////////////////////
    // Instance methods //
    //////////////////////

    /** (r,g,b,a) 를 나타내는 Color 를 생성합니다. 각 성분은 [0, 255] 까지의 범위를 가집니다. */
    constructor(r=255, g=255, b=255, a=255) { this.assign(r,g,b,a); }


    /** Color 를 나타내는 string 을 돌려줍니다. */
    toString() { return `rgba(${this.r},${this.g},${this.b},${this.a})`; }


    /** 각 성분을 r,g,b,a 로 설정한 후, this 를 돌려줍니다. */
    assign(r=255,g=255,b=255,a=255) { 
        this.rgba = r | (g << 8) | (b << 16) | (a << 24); 
        this.rgba >>>= 0;
        return this;
    }


    /** rgb 성분에 scalar 를 곱한 결과를 out 에 담아 돌려줍니다. */
    mulScalar(scalar, out=new Color()) {

        return out.assign(
            Math.floor(this.r * scalar),
            Math.floor(this.g * scalar),
            Math.floor(this.b * scalar),
            this.a
        );
    }


    /** color 의 r 성분을 나타내는 number. [0,255] 범위를 가집니다. */
    get r() { return this.rgba & 0x000000ff; }
    set r(r) { 
        this.rgba = this.rgba & 0xffffff00 | r; 
        this.rgba >>>= 0;
        return r; 
    }
    
    
    /** color 의 g 성분을 나타내는 number. [0,255] 범위를 가집니다. */
    get g() { return (this.rgba & 0x0000ff00) >>> 8; }
    set g(g) { 
        this.rgba = this.rgba & 0xffff00ff | (g << 8); 
        this.rgba >>>= 0;
        return g; 
    }
    
    
    /** color 의 b 성분을 나타내는 number. [0,255] 범위를 가집니다. */
    get b() { return (this.rgba & 0x00ff0000) >>> 16; }
    set b(b) { 
        this.rgba = this.rgba & 0xff00ffff | (b << 16); 
        this.rgba >>>= 0;
        return b; 
    }
    
    
    /** color 의 a 성분을 나타내는 number. [0,255] 범위를 가집니다 (0 = transparent, 255 = opaque). */
    get a() { return (this.rgba & 0xff000000) >>> 24; }
    set a(a) { 
        this.rgba = this.rgba & 0x00ffffff | (a << 24); 
        this.rgba >>>= 0;
        return a; 
    }
};


/** Material 을 정의합니다. */
export class Material {

    /** 머터리얼의 이름을 나타내는 string. */
    name = "Material";

    
    /** 메인 텍스처. */
    mainTex = null;


    /** 본들의 목록을 나타내는 Map<string, Bone>. 해당 속성은 읽기 전용(read-only)이며,
     * 
     *  Renderer 에서 vertexShader 를 호출할때 전달해줍니다. */
    bones;


    /** 삼각형을 픽셀을 채우는 대신, 선을 그리는 것으로 렌더링합니다. */
    wireFrameMode = false;


    /** wireFrameMode = true 일 때, 선의 색상을 결정합니다. */
    wireFrameColor = Color.black;


    /** 카메라와 같은 방향을 보고 있는 삼각형은 렌더링하지 않도록 합니다. */
    backfaceCulling = true;


    /** 원근투영(perspective)이 사용되는지 여부. true 라면 vertexShader 에서 
     * 
     *  objectToClipPos 를 호출한다고 가정합니다. */
    usePerspective = true;


    /** 서브메시(submesh)의 삼각형 갯수.*/
    triangleCount = Number.MAX_SAFE_INTEGER;


    /** 깊이 값(z)을 비교하여, 뒤에 있는 삼각형이 가려지도록 합니다. */
    zTest = true;


    ///////////////////////
    // Public Methods    //
    ///////////////////////


    /** Material 을 생성합니다.  */
    constructor(vertexShader = Shader.defaultVertexShader, fragmentShader = Shader.defaultFragmentShader) {
        this.vertexShader   = vertexShader;
        this.fragmentShader = fragmentShader;
    }


    /** 정점 셰이더. */
    vertexShader;


    /** 픽셸 셰이더. */
    fragmentShader;
};


/** 셰이더 함수들과 상수들을 정의합니다. */
export class Shader {
    static #temp = new Vector3();


    /** Texture 에서 uv 좌표에 위치한 픽셀을 얻습니다. 결과는 Color 이며 out 에 담아 돌려줍니다. */
    static tex2D(texture, uv, out=new Color()) {

        if(texture == null) {                      // texture 가 유효하지 않다면 대신 
            return out.assign(224, 124, 235, 255); // rgba(224, 124, 235, 255) 를 돌려준다.
        }
        const x = Math.round(uv.x * texture.width);
        const y = Math.round(uv.y * texture.height);

        return texture.getColor(x,y, out);
    }


    /** out = (FINAL_MATRIX · position) */
    static objectToClipPos(position, out=new Vector4()) {
        return Shader.FINAL_MATRIX.mulVector(position, out);
    }


    /** 램버트 조명의 결과를 돌려줍니다. */
    static lambert(normal, lightDir) {
        lightDir = lightDir.mulScalar(-1, Shader.#temp);
        return Math.max(Vector3.dot(normal, lightDir), 0);
    }


    /** vertexShader 의 기본값.  */
    static defaultVertexShader(vertex, vertexOut, properties) {
        const deformer = vertex.deformer;
        const position = deformer ? deformer.deformPosition(vertex, properties.bones) : vertex.position;

        Shader.objectToClipPos(position, vertexOut.position);
        vertexOut.uv.assign(vertex.uv);
    }


    /** fragmentShader 의 기본값. properties.mainTex 에서 vertex.uv 에 위치한 Color 를 사용합니다. */
    static defaultFragmentShader(vertex, colorOut, properties) {
        Shader.tex2D(properties.mainTex, vertex.uv, colorOut);
    }


    /** Material 의 기본값 */
    static DEFAULT_MATERIAL = new Material(Shader.defaultVertexShader, Shader.defaultFragmentShader);


    /** 현재 렌더링하고 있는 GameObject 의 모델링 행렬(Modeling Matrix). */
    static MODEL_MATRIX = new Matrix4x4();


    /** 현재 렌더링하고 있는 Camera 의 뷰 행렬(View Matrix) */
    static VIEW_MATRIX = new Matrix4x4();


    /** 현재 렌더링하고 있는 Camera 의 원근투영 행렬(Perspective Matrix) */
    static PERSPECTIVE_MATRIX = new Matrix4x4();


    /** VIEW_PERSPECTIVE_MATRIX = (PerspectiveMatrix · ViewMatrix) */
    static VIEW_PERSPECTIVE_MATRIX = new Matrix4x4();


    /** FINAL_MATRIX = (PERSPECTIVE_MATRIX ·  VIEW_MATRIX · MODEL_MATRIX) */
    static FINAL_MATRIX = new Matrix4x4();
};