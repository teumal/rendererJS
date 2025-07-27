
import {Vector2, Vector3, Vector4, Matrix4x4, MyMath } from "./MyMath.js";
import {Transform} from "./Transform.js";
import { GameEngine } from "./GameEngine.js";


/** Camera 는  */
export class Camera {
    static #cameras = [];

    #transform = new Transform();


    /** 화각(Field Of View)를 나타내는 number. */
    fov;


    /** 근평면의 z 값을 나타내는 number. */
    zNear;


    /** 원평면의 z 값을 나타내는 number. */
    zFar;


    /** 뷰포트(viewport)의 영역을 지정하는 number. */
    sx; sy; width; height;


    ///////////////////////
    // Static methods    //
    ///////////////////////


    /**  */
    static findCameraByIndex(index) { return Camera.#cameras[index]; }


    /** 존재하는 카메라들의 갯수를 얻습니다. 결과는 number 입니다. */
    static get cameraCount() { return Camera.#cameras.length; }


    /** 메인 카메라를 얻습니다. 메인 카메라는 0 번째 인덱스를 가진 카메라를 의미합니다. */
    static get main() { return Camera.#cameras[0]; }


    ///////////////////////
    // Instance methods  //
    ///////////////////////


    /** Camera 를 생성합니다. (sx,sy,width,height) 는 canvas 에서 카메라가 표시할 사각형 영역을 설정하는 viewport 이며,
     * 
     *  fov, zNear, zFar 는 화각, 근평면의 깊이, 원평면의 깊이값이며, 원근투영 행렬(perspective)을 만드는데 사용됩니다. */
    constructor(sx, sy, width, height, fov=90, zNear=10, zFar=100) {
        this.setViewport(sx, sy, width, height);

        this.fov   = fov;
        this.zNear = zNear;
        this.zFar  = zFar;

        this.transform.name = `Camera ${Camera.cameraCount}`;
        Camera.#cameras.push(this);
    }


    /** viewport 는 canvas 에서 카메라가 사용할 사각형 영역을 의미합니다. min = (sx,sy), max = (sx+width, sy+height) 처럼 사용됩니다. */
    setViewport(sx, sy, width, height) {

        if(GameEngine.initialized) {
            const resolution = GameEngine.getResolution();

            this.sx     = MyMath.clamp(sx, 0, resolution.x);
            this.sy     = MyMath.clamp(sy, 0, resolution.y);
            this.width  = MyMath.clamp(width, 0, resolution.x-this.sx);
            this.height = MyMath.clamp(height, 0, resolution.y-this.sy);
        }
        else {
            this.sx     = sx;
            this.sy     = sy;
            this.width  = width;
            this.height = height;
        }
    }


    /** viewport 를 나타내는 Vector4 (sx, sy, width, height) 를 얻습니다. */
    getViewport() { return new Vector4(this.sx, this.sy, this.width, this.height); }


    /** Camera 를 나타내는 stirng 을 돌려줍니다. */
    toString() {
        const a = `${this.#transform}\n`;
        const b = `(sx,sy,width,height) : ${new Vector4(this.sx, this.sy, this.width, this.height)}\n`;
        const c = `fov (field of view)  : ${this.fov}\nzNear : ${this.zNear}\nzFar : ${this.zFar}`;
        return a + b + c;
    }


    /** 월드 좌표를 스크린 좌표로 변환합니다. 결과는 Vector2 이며 out 에 담아 돌려줍니다. 
     * 
     *  스크린 좌표는 x,y 성분이 항상 정수(integer)이어야 합니다. Vector2.lerp 등의 함수로 인해
     * 
     *  부동소수점(floating-point)으로 취급되었다면, Math.round 등의 함수로 다시 정수로 만들어주어야 합니다.
    */
    worldToScreen(worldPos, out=new Vector2()) {
        const halfw = this.width * 0.5;
        const halfy = this.height * 0.5;

        return out.assign(
            Math.round(this.sx + worldPos.x + halfw), // 스크린 좌표는 항상 정수 만을 사용하므로,
            Math.round(this.sy - worldPos.y + halfy)  // round 를 호출하여 정수로 만들어 준다.
        );
    }


    /** 스크린 좌표를 월드 좌표로 변환합니다. 결과는 Vector3 이며 out 에 담아 돌려줍니다. out.z 는 0 으로 설정됩니다. */
    screenToWorld(screenPos, out=new Vector3()) {
        const halfw = this.width * 0.5;
        const halfh = this.height * 0.5;

        return out.assign(
            screenPos.x - halfw - this.sx,
            -(screenPos.y - halfh - this.sy),
            0
        );
    }


    /** 뷰 행렬(view matrix)을 나타내는 Matrix4x4 을 out 에 담아 돌려줍니다. */
    view(out=new Matrix4x4()) { return this.#transform.invTRS(out); }


    /** 원근투영 행렬(perpective matrix)를 나타내는 Matrix4x4 를 out 에 담아 돌려줍니다. */
    perspective(out=new Matrix4x4()) {
        const d = 1 / Math.tan(this.fov * MyMath.DEG2RAD1_2); // d = 1 / tan(fov * 0.5)
        const a = this.aspectRatio;                           // a = height / width
        const n = this.zNear;
        const f = this.zFar;

        const A = -(n+f) / (n-f);
        const B = f - A*f;

        out.basisX.assign(d*a, 0, 0, 0); // x, y, z 값을 [-1, 1] 범위가 되도록 정규화시킨다. 
        out.basisY.assign(0,   d, 0, 0); //  object          clip             ndc
        out.basisZ.assign(0,   0, A, 1); // (x,y,n,1) => (x`,y`,-n,n) => (x``,y``,-1,1)
        out.basisW.assign(0,   0, B, 0); // (x,y,f,1) => (x`,y`,f,f)  => (x``,y``,1,1)

        return out;
    }


    /** clip 좌표를 NDC 좌표로 변환한 결과를 out 에 담아 돌려줍니다. */
    clipToNDC(clipPos, out=new Vector4()) {
        let w = clipPos.w;

        if(w == 0) {
            w = Number.EPSILON;
        }
        const div = 1 / w;

        out.assign(
            clipPos.x * div,
            clipPos.y * div,
            clipPos.z * div,
            clipPos.w * div
        );

        return out;
    }    


    /** ndc 좌표에 카메라의 해상도(width,height)을 곱해준 결과를 out 에 담아 돌려줍니다. */
    ndcToViewport(ndcPos, out=new Vector4()) {

        return out.assign(
            ndcPos.x * this.width * 0.5,
            ndcPos.y * this.height * 0.5,
            ndcPos.z,
            ndcPos.w
        );
    }


    /** clip 좌표를 NDC 좌표로 변환 후, 카메라의 해상도(width,height)를 곱해준 결과를 out 에 담아 돌려줍니다. 
     * 
     *  이후에 있을 원근 투영 보정(Perspective-Correct Interpolation)을 위해, w 값은 1/clipPos.w 을 보존합니다. */
    clipToViewport(clipPos, out=new Vector4()) {
        let w = clipPos.w;

        if(w == 0) {
            w = Number.EPSILON;
        }
        const div = 1 / w;

        return out.assign(
            clipPos.x * div * this.width * 0.5,
            clipPos.y * div * this.height * 0.5,
            clipPos.z * div,
            div
        );
    }


    /** 주어진 선분을 카메라의 영역에 맞도록 잘라줍니다. 결과는 from, to 에 저장되며, 복사본을 생성하지 않습니다. 
     * 
     *  from, to 는 항상 스크린 좌표(screen space)를 나타내는 Vector2 이어야 합니다. clampLine 은 두 점이
     * 
     *  카메라 영역 내에 존재하는지 여부를 돌려줍니다. false 를 돌려준다면 선은 그리지 않아도 된다는 의미입니다. */
    clipLine(from, to) {
        const xMin = this.sx;                 // from = (a,b), to = (c,d)
        const xMax = this.sx + this.width-1;  // 카메라 영역 좌표를 모두 알고 있으므로, 스칼라 계수 s 를 구할 수 있다.
        const yMin = this.sy;                 // 선형결합으로 선분의 기울기를 유지하며, from, to 를 수정한다.
        const yMax = this.sy + this.height-1; // screenPoint 는 setPixel 을 인덱싱하는데 사용되므로 -1 을 해준다.

        if(from.x <= xMin && to.x <= xMin) return false; // 두 점 모두 좌측 밖에 있는 경우.
        if(from.x >= xMax && to.x >= xMax) return false; // 두 점 모두 우측 밖에 있는 경우.
        if(from.y <= yMin && to.y <= yMin) return false; // 두 점 모두 위쪽 밖에 있는 경우.
        if(from.y >= yMax && to.y >= yMax) return false; // 두 점 모두 아래쪽 밖에 있는 경우.

        if(to.x >= xMax) {
            const a = from.x;                          // to 가 카메라의 우측 밖으로 나간 경우.
            const c = to.x;                            // xMax = a·(1-s) + s·c
            Vector2.lerp(from,to, (xMax-a)/(c-a), to); // s    = (xMax-a)/(c-a)
        }
        if(to.x <= xMin) {
            const a = from.x;                          // to 가 카메라의 좌측 밖으로 나간 경우.
            const c = to.x;                            // xMin = a·(1-s) + s·c
            Vector2.lerp(from,to, (xMin-a)/(c-a), to); // s    = (xMin-a)/(c-a)
        }
        if(to.y <= yMin) {
            const b = from.y;                          // to 가 카메라의 윗쪽 밖으로 나간 경우.
            const d = to.y;                            // yMin = b·(1-s) + s·d
            Vector2.lerp(from,to, (yMin-b)/(d-b), to); // s    = (yMin-b)/(d-b)
        }
        if(to.y >= yMax) {
            const b = from.y;                          // to 가 카메라의 아랫쪽 밖으로 나간 경우.
            const d = to.y;                            // yMax = b·(1-s) + s·d
            Vector2.lerp(from,to, (yMax-b)/(d-b), to); // s    = (yMax-b)/(d-b)
        }

        if(from.x >= xMax) {
            const a = from.x;                            // from 이 카메라의 우측 밖으로 나간 경우.
            const c = to.x;                              // xMax = a·(1-s) + s·c
            Vector2.lerp(from,to, (xMax-a)/(c-a), from); // s    = (xMax-a)/(c-a)
        }
        if(from.x <= xMin) {
            const a = from.x;                            // from 이 카메라의 좌측 밖으로 나간 경우.
            const c = to.x;                              // xMin = a·(1-s) + s·c
            Vector2.lerp(from,to, (xMin-a)/(c-a), from); // s    = (xMin-a)/(c-a)
        }
        if(from.y <= yMin) {
            const b = from.y;                            // from 이 카메라의 아랫쪽 밖으로 나간 경우.
            const d = to.y;                              // yMax = b·(1-s) + s·d
            Vector2.lerp(from,to, (yMin-b)/(d-b), from); // s    = (yMax-b)/(d-b)
        }
        if(from.y >= yMax) {
            const b = from.y;                            // from 이 카메라의 아랫쪽 밖으로 나간 경우.
            const d = to.y;                              // yMax = b·(1-s) + s·d
            Vector2.lerp(from,to, (yMax-b)/(d-b), from); // s    = (yMax-b)/(d-b)
        }

        from.x = Math.round(from.x); // lerp 로 인해 from, to 의 성분들은
        from.y = Math.round(from.y); // 정수가 아니게 되었으므로, round 함수로
        to.x   = Math.round(to.x);   // 정수로 반올림 해준다.
        to.y   = Math.round(to.y);

        return true;
    }


    /** 종횡비(aspect ratio)를 얻습니다. 결과는 (height / width)를 나타내는 number 입니다. */
    get aspectRatio() { return this.height / this.width; }


    /** 카메라의 Transform 을 얻습니다. */
    get transform() { return this.#transform; }


    /** 카메라 영역의 최솟값 (sx, sy)을 돌려줍니다. */
    get min() { return new Vector2(this.sx, this.sy); }


    /** 카메라 영역의 최댓값 (sx+width, sy+height)을 돌려줍니다. */
    get max() { return new Vector2(this.sx + this.width, this.sy + this.height); }
};