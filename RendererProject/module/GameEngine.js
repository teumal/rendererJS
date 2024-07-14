import {Vector2, Vector3, Vector4, Matrix4x4} from "./MyMath.js";
import * as MyMath from "./MyMath.js";
import {Renderer, Mesh, Color, MeshType, Texture} from "./Renderer.js";

export const KeyCode = {
    Left  : "ArrowLeft",
    Right : "ArrowRight",
    Up    : "ArrowUp",
    Down  : "ArrowDown",
    
    W : "w",
    A : "a",
    S : "s",
    D : "d",

    Space : " ",

    Alpha0  : "0",
    Alpha1  : "1",
    Alpha2  : "2",
    Alpha3  : "3",
    Alpha4  : "4",
    Alpha5  : "5",
    Alpha6  : "6",
    Alpha7  : "7",
    Alpha8  : "8",
    Alpha9  : "9",
    Alpha10 : "10",
};
export const BoneType = { Static: 0, Dynamic: 1 };

const KeyState = {
    KeyDown  : 1,
    KeyPress : 2,
    KeyUp    : 4,
    Dirty    : 8,
    None     : 16,
};


export class GameEngine {
    static #prevTimestamp = 0;
    static #curTimestamp  = 0;

    static #inputState = [];
    static #inputQueue = [];

    static #textQueue  = [];
    static #backBuffer = null;
    $cvs; $ctx; 

    // 캔버스의 해상도를 설정합니다.
    // 인자가 하나라면 `w` 를 Vector2 로 취급합니다.
    static setResolution(w,h) {
        
        if(arguments.length==1) {
            this.$cvs.width  = w.x;
            this.$cvs.height = w.y;
            return;
        }
        else {
            this.$cvs.width  = w;
            this.$cvs.height = h;
        }
        this.#backBuffer = this.$ctx.getImageData(0,0,w,h);
    }


    // 캔버스의 해상도를 얻습니다. 리턴값은 Vector2 이며,
    // (width, height) 으로 구성됩니다.
    static getResolution() {
        return new Vector2(this.$cvs.width, this.$cvs.height);
    }


    // `screenPoint` 위치에 픽셀 한칸을 찍는 연산을 후면버퍼에 기록합니다.
    static setPixel(screenPoint, color=Color.black) {
        // this.$ctx.fillStyle = color;
        // this.$ctx.fillRect(screenPoint.x, screenPoint.y, 1, 1);

        const index = (screenPoint.y * this.$cvs.width * 4) + (screenPoint.x * 4);
        const data  = GameEngine.#backBuffer.data;

        data[index]   = color.r * 255;
        data[index+1] = color.g * 255;
        data[index+2] = color.b * 255;
        data[index+3] = color.a * 255;
    }


    // `camera` 가 보고 있는 구역을 지워버립니다.
    static clearCamera(camera) {
       const screenSize = camera.screenSize;
       this.$ctx.clearRect(0, 0, screenSize.x, screenSize.y);
    }


    // 게임엔진을 초기화한 후, 씬을 실행합니다.
    static initialize() {

        window.addEventListener("keydown", (e)=>{
            const queue = GameEngine.#inputQueue;
            const state = GameEngine.#inputState;
            const time  = Date.now();

            if(state[e.key]==undefined) {
                state[e.key] = { key: KeyState.None, time: time };
            }
            if(state[e.key].key==KeyState.None && state[e.key].time <= time) {
                state[e.key] = { key: KeyState.KeyDown, time: time };
            }
            queue.push({ key: e.key, time: time });
        });
        window.addEventListener("keyup", (e)=>{
            const queue = GameEngine.#inputQueue;
            const state = GameEngine.#inputState;
            const time  = Date.now();

            if(state[e.key]==undefined) {
                state[e.key] = { key: KeyState.None, time: time };
            }
            if(state[e.key].key==KeyState.KeyPress && state[e.key].time <= time) {
                state[e.key] = { key: KeyState.KeyUp, time: time };
            }
            queue.push({ key: e.key, time: time });
        });

        const updateFn = (t)=>{
            const inputQueue = GameEngine.#inputQueue;
            const inputState = GameEngine.#inputState;

            // deltaTime 을 계산합니다.
            GameEngine.#prevTimestamp = GameEngine.#curTimestamp;
            GameEngine.#curTimestamp  = t;

            // update() => animate() => render()
            GameEngine.clearCamera(Camera.mainCamera);
            GameObject.update();
            GameObject.render();

            // 후면 버퍼의 내용을 캔버스에 제출하고, 버퍼를 초기화한다.
            GameEngine.$ctx.putImageData(GameEngine.#backBuffer, 0, 0);
            GameEngine.#backBuffer.data.fill(0, 0);

            // textUI 를 그린다.
            GameEngine.$ctx.fillStyle = 'black';

            for(let i=0; i<GameEngine.#textQueue.length; ++i) {
                const op = GameEngine.#textQueue[i];
                GameEngine.$ctx.fillText(op.text, op.x, op.y);
            }
            GameEngine.#textQueue = [];


            // 입력정보를 갱신합니다.
            for(let i=0; i<inputQueue.length; ++i) {
                const event = inputQueue[i];
                const state = inputState[event.key];

                const prevState = state.key;

                // 발생한 이벤트가 `KeyDown` 인 경우
                if(state.key==KeyState.KeyDown && event.time >= state.time) {
                    inputState[event.key] = { key: KeyState.KeyPress, time: event.time };
                }

                // 발생한 이벤트가 `KeyUp` 인 경우
                else if(state.key==KeyState.KeyUp && event.time >= state.time) {
                    inputState[event.key] = { key: KeyState.None, time: event.time };
                }
            }
            inputQueue.length = 0; // 큐를 비운다.
            window.requestAnimationFrame(updateFn);
        };
        updateFn(0);
    }


    // 게임엔진에게 TextUI 를 그리라고 제출합니다.
    static drawText(text, x, y) {
        GameEngine.#textQueue.push({
           text : text,
           x : x,
           y : y
        });
    }


    // 키를 눌렀는지 여부를 검사합니다.
    static getKeyDown(keyCode) { 

        if(GameEngine.#inputState[keyCode]==undefined) {
            return false;
        }
        return (GameEngine.#inputState[keyCode].key & KeyState.KeyDown)!=0;
    }


    // 키를 누르고 있는지 여부를 검사합니다.
    static getKey(keyCode) { 
        if(GameEngine.#inputState[keyCode]==undefined) {
            return false;
        }
        return (GameEngine.#inputState[keyCode].key & (KeyState.KeyPress | KeyState.KeyDown))!=0; 
    }


    // 키를 뗐는지 여부를 검사합니다.
    static getKeyUp(keyCode) { 
        if(GameEngine.#inputState[keyCode]==undefined) {
            return false;
        }
        return (GameEngine.#inputState[keyCode].key & KeyState.KeyUp)!=0;
    }


    // 캔버스를 등록하거나, 얻습니다.
    static get canvas() { return this.$cvs; }
    static set canvas(cvs) { this.$cvs = cvs; this.$ctx = cvs.getContext('2d'); }


    // 이전 프레임부터 현 프레임까지 걸린 시간을 나타냅니다.
    static get deltaTime() { return (GameEngine.#curTimestamp - GameEngine.#prevTimestamp) * 0.001; }
};


export class Transform {
    #localPosition;    // Vector3
    #localScale;       // Vector3
    #localRotation;    // Matrix4x4
    #invLocalRotation; // Matrix4x4

    #worldPosition;    // Vector3
    #worldScale;       // Vector3
    #worldRotation;    // Matrix4x4
    #invWorldRotation; // Matrix4x4

    #parent = null; // Transform
    #childs = [];   // Transform[]
    

    // 오일러각을 사용하여 회전 행렬을 만들어냅니다.
    // `invert==true` 이면, 역행렬을 만들어냅니다.
    static euler(localRotation, invert=false) {
        const rotX = localRotation.x * MyMath.deg2rad;
        const rotY = localRotation.y * MyMath.deg2rad;
        const rotZ = localRotation.z * MyMath.deg2rad;

        const sinX = Math.sin(rotX), cosX = Math.cos(rotX); // x축 회전에 쓰일 Sin, Cos 값
        const sinY = Math.sin(rotY), cosY = Math.cos(rotY); // y축 회전에 쓰일 Sin, Cos 값
        const sinZ = Math.sin(rotZ), cosZ = Math.cos(rotZ); // z축 회전에 쓰일 Sin, Cos 값

        const yaw = new Matrix4x4(
            new Vector4(cosY, 0, -sinY, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(sinY, 0, cosY, 0),
            new Vector4(0, 0, 0, 1),
        );
        const pitch = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, cosX, sinX, 0),
            new Vector4(0, -sinX, cosX, 0),
            new Vector4(0, 0, 0, 1),
        );
        const roll = new Matrix4x4(
            new Vector4(cosZ, -sinZ, 0, 0),
            new Vector4(sinZ, cosZ, 0, 0),
            new Vector4(0, 0, 1, 0),
            new Vector4(0, 0, 0, 1),
        );

        if(invert) {
            const invYaw   = yaw.transpose();
            const invPitch = pitch.transpose();
            const invRoll  = roll.transpose();
            return invRoll.mulMat(invPitch, invYaw);
        }
        return yaw.mulMat(pitch, roll);
    }


    // `Transform.euler` 로 생성한 회전 행렬 `R` 을 
    // 오일러각을 나타내는 `Vector3` 로 변환해 돌려줍니다.
    static toEuler(R) {
        const pitch = Math.asin(R.basisY.z);
        const div   = 1 / Math.cos(pitch);
        const yaw   = Math.asin(-R.basisX.z / div);
        const roll  = Math.acos(R.basisY.y / div);

        return new Vector3(pitch, yaw, roll);
    }


    // 로드리게스 회전공식을 사용하여 회전 행렬을 만들어냅니다.
    static rodrigues(axis, angle) {
        angle = MyMath.deg2rad * angle;

        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const B   = 1-cos;
        const a   = axis.x;
        const b   = axis.y;
        const c   = axis.z;

        return new Matrix4x4(
            new Vector4((cos+a*a*B),    (sin*c+b*a*B),  (sin*-b+c*a*B), 0),
            new Vector4((sin*-c+a*b*B), (cos+b*b*B),    (sin*a+c*b*B),  0),
            new Vector4((sin*b+a*c*B),  (sin*-a+b*c*B), (cos+c*c*B),    0),
            new Vector4(0,0,0,1)
        );
    }


    // 인자로 주어진 `scale`, `rotation`, `position` 값을 통해
    // 모델링 행렬 `M` 을 만들어 돌려줍니다. 여기서 `rotation` 은
    // 오일러각을 나타내는 Vector3 로 사용됩니다.
    static TRS(position, scale, rotation) {

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = Transform.euler(rotation);
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.toVector4()
        );
        return S.mulMat(R, T);
    }


    // 인자로 주어진 `scale`, `rotation`, `position` 값을 통해
    // 모델링 행렬 `M` 의 역원을 만들어 돌려줍니다. 여기서 `rotation` 은
    // 오일러각을 나타내는 Vector3 로 사용됩니다.
    static invTRS(position, scale, rotation) {

        const invS = new Matrix4x4(
            new Vector4(1/scale.x, 0, 0, 0),
            new Vector4(0, 1/scale.y, 0, 0),
            new Vector4(0, 0, 1/scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const invR = Transform.euler(rotation, true);
        const invT = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.mul(-1).toVector4()
        );
        return invT.mulMat(invR, invS);
    }


    // `worldTransform` 의 역행렬을 얻습니다.
    invWorldTRS() {
        const scale    = this.#worldScale;
        const position = this.#worldPosition;

        const S = new Matrix4x4(
            new Vector4(1/scale.x, 0, 0, 0),
            new Vector4(0, 1/scale.y, 0, 0),
            new Vector4(0, 0, 1/scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = this.#invWorldRotation;
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.mul(-1).toVector4()
        );
        return T.mulMat(R,S);
    }


    // `localTransform` 의 역행렬을 얻습니다.
    localTRS() {
        const scale    = this.#localScale;
        const position = this.#localPosition;

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = this.#localRotation;
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.toVector4()
        );
        return S.mulMat(R,T);
    }
    

    // 부모의 `worldTransform` 과 자신의 `localTransform` 을 사용하여,
    // 자신의 `worldTransform` 을 갱신합니다. 또한 자신의 월드 트랜스폼이
    // 수정되었으므로, 모든 자식들의 월드 트랜스폼 또한 수정되어야 합니다.
    calculateWorld() {
        const parent = this.#parent;

        const s0    = this.#localScale;
        const r0    = this.#localRotation;
        const invR0 = this.#invLocalRotation;
        const t0    = this.#localPosition;

        if(this.#parent != null) {
            const s1    = parent.#worldScale;
            const r1    = parent.#worldRotation;
            const invR1 = parent.#invWorldRotation;
            const t1    = parent.#worldPosition;

            this.#worldScale       = s0.mulVector(s1);                       // s0 * s1
            this.#worldRotation    = r0.mulMat(r1);                          // r1 * r0
            this.#invWorldRotation = invR1.mulMat(invR0);                    // r0^(-1) * r1^(-1)
            this.#worldPosition    = r1.mulVector(t0.toVector4()).toVector3().mulVector(s1).add(t1); // (r1 * t0) * s1 + t1
        }
        else {
            this.#worldScale       = s0.clone();
            this.#worldRotation    = r0;
            this.#invWorldRotation = invR0;
            this.#worldPosition    = t0.clone();
        }

        for(const child of this.#childs) {
            child.calculateWorld();
        }
    }


    // 자신의 `worldTransform` 과 부모의 `worldTransform` 을 사용하여,
    // 자신의 `localTransform` 을 갱신합니다. 여기서 자식들의 월드 트랜스폼이
    // 수정될 필요는 없습니다. 자신의 월드 트랜스폼은 동일하기 때문입니다.
    calculateLocal() {
        const parent = this.#parent;

        const s0 = this.#worldScale;
        const r0 = this.#worldRotation;
        const t0 = this.#worldPosition;

        if(this.#parent != null) {

            const invS1 = new Vector3(
                1/parent.#worldScale.x, 
                1/parent.#worldScale.y,
                1/parent.#worldScale.z
            );
            const invR1 = parent.#invWorldRotation;
            const t1    = parent.#worldPosition;

            this.#localScale       = s0.mulVector(invS1);           // s0 * s1^(-1)
            this.#localRotation    = r0.mulMat(invR1);              // invR1 * r0
            this.#invLocalRotation = this.#localRotation.inverse(); // (invR1 * r0)^(-1)
            this.#localPosition    = invR1.mulVector(               // invR1 * ((t0-t1) * invS1)
                t0.sub(t1).mulVector(invS1).toVector4()
            ).toVector3();
            return;
        }
        this.#localPosition    = this.#worldPosition.clone();
        this.#localRotation    = this.#worldRotation;
        this.#invLocalRotation = this.#invWorldRotation;
        this.#localScale       = this.#worldScale.clone();
    }


    // 루트 트랜스폼을 생성합니다. 생성된 트랜스폼은 어떠한 부모나 자식도 가지고 있지 않습니다.
    constructor(position=Vector3.zero, scale=Vector3.one, rotation=Vector3.zero) {
        const R    = Transform.euler(rotation);
        const invR = Transform.euler(rotation, true);

        this.#localPosition    = position.clone();
        this.#localScale       = scale.clone();
        this.#localRotation    = R;
        this.#invLocalRotation = invR;

        this.#worldPosition    = position.clone();
        this.#worldScale       = scale.clone();
        this.#worldRotation    = R;
        this.#invWorldRotation = invR;
        
    }


    // 해당 트랜스폼을 나타내는 문자열을 돌려줍니다.
    toString() {
       const localInfo = `\nlocalScale : ${this.#localScale}\n\nlocalRotation : ${this.#localRotation}\n\nlocalPosition : ${this.#localPosition}\n`;
       const worldInfo = `\nworldScale : ${this.#worldScale}\n\nworldRotation : ${this.#worldRotation}\n\nworldPosition : ${this.#worldPosition}\n`;
       return localInfo+worldInfo;
    }


    // 모델링 행렬를 얻습니다. 모델링 행렬은 parent.worldTransform * this.localTransform 을 수행합니다.
    model() { 
        const scale    = this.#worldScale;
        const position = this.#worldPosition;

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = this.#worldRotation;
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.toVector4()
        );
        return S.mulMat(R, T);
    }
    

    // `localScale`, `localRotation`, `localPosition` 를 한번에 설정합니다.
    setTransform(position, scale, rotation) {
        this.#localScale       = scale.clone();
        this.#localRotation    = Transform.euler(rotation);
        this.#invLocalRotation = Transform.euler(rotation, true);
        this.#localPosition    = position.clone();
        this.calculateWorld();
    }


    // 자식을 추가합니다. 이미 `newChild` 를 자식으로 가지고 있다면,
    // 아무 일도 일어나지 않습니다.
    addChild(newChild) {
        const index = this.#childs.indexOf(newChild);

        if(index < 0) {
            newChild.parent = this;
        }
    }


    // 자식을 제거합니다. 해당 연산은 `target` 이 실제로 자신을 부모로 가지고 있는 경우에만
    // 적용됩니다. 그렇지 않다면, 아무 일도 일어나지 않습니다.
    removeChild(target) {
        
        if(target.#parent==this) {
            target.#parent = null;
        }
    }


    // `localScale` 을 수정하거나 얻습니다. `localTransform` 이 변경되므로, 자신과 자신의 모든
    // 자식들의 `worldTransform` 은 수정됩니다. 또한, 계층구조에서는 비균등한 스케일링은 지원하지 않습니다.
    // 다시 말해, 계층구조를 사용한다면 scale 값의 모든 성분은 (2,2,2) 와 같이 같아야 합니다.
    get localScale() { return this.#localScale.clone(); }
    set localScale(newScale) {
        this.#localScale = newScale.clone();
        this.calculateWorld();
    }


    // `localRotation` 을 수정하거나 얻습니다. `localTransform` 이 변경되므로, 자신과 자신의 모든
    // 자식들의 `worldTransform` 은 수정됩니다. 인자는 오일러각을 나타내는 Vector3 입니다.
    // 내부적으로는 회전행렬로서 저장됩니다. 이후에는 Quarternion 의 형태가 될 예정입니다.
    get localRotation() { return this.#localRotation.clone(); }
    set localRotation(newRotation) { 
        this.#localRotation    = Transform.euler(newRotation);
        this.#invLocalRotation = Transform.euler(newRotation, true);
        this.calculateWorld();
    }


    // `localPosition` 을 수정하거나 얻습니다. `localTransform` 이 변경되므로, 자신과 자신의 모든
    // 자식들의 `worldTransform` 은 수정됩니다.
    get position() { return this.#localPosition.clone(); }
    set position(newPosition) {
        this.#localPosition = newPosition.clone();
        this.calculateWorld();
    }


    // 부모를 수정하거나 얻습니다. 부모 또한 `Transform` 입니다. 부모를 제거하는 경우
    // 인자로 `null` 을 줘야 하며, 단순히 `localTransform` 이 `worldTransform` 이됩니다.
    // 새로운 부모를 설정한 경우, 자신의 `localTransform` 은 재계산되야 합니다.
    // 자식들의 `worldTransform` 또는 `localTransform` 을 수정할 필요가 없습니다.
    // 이는 자신의 월드 트랜스폼은 결국 그대로이기 때문입니다.
    get parent() { return this.#parent; }
    set parent(transform=null) {
        const parent    = this.#parent;
        const newParent = transform;

        // 이미 부모-자식 관계라면 리턴
        if(this.#parent==transform) {
            return;
        }

        // 기존의 부모에서 분리. 기존의 부모는 자식의 목록에서
        // 자신을 제거한다.
        if(this.#parent != null) {
            const index = parent.#childs.indexOf(this);
            parent.#childs.splice(index,1);
        }
        this.#parent = transform;

        // 부모는 자식 목록에 자식을 넣는다.
        if(transform != null) {
            newParent.#childs.push(this);
        }

        // 로컬 트랜스폼 재계산
        this.calculateLocal();
    }
};


export class Camera {
    static tileSize   = 20;
    static mainCamera = new Camera();
    
    transform = new Transform();
    screenSize;
    depthBuffer;

    fov   = 30;
    zNear = 1 / Math.tan(this.fov * MyMath.deg2rad * 0.5); 
    zFar  = 500;
    
    // 카메라의 너비를 설정합니다. 인자가 하나라면, `width` 를 Vector2 로 취급합니다.
    constructor(width, height) {

        if(arguments.length==1) {
            this.screenSize = width.clone();
            return;
        }
        this.screenSize = new Vector2(width, height);
    }


    // 데카르트 좌표계를 스크린 좌표계로 변경합니다.
    // 스크린 좌표계는 항상 정수로 반올림됩니다.
    worldToScreen(worldPosition) {
        const halfw = this.screenSize.x * 0.5;
        const halfh = this.screenSize.y * 0.5;

        return new Vector2(
            Math.round(worldPosition.x * Camera.tileSize + halfw),
            Math.round(-worldPosition.y * Camera.tileSize+ halfh)
        );
    }


    // 스크린 좌표계를 데카르트 좌표계로 변경합니다.
    screenToWorld(screenPosition) {
        const halfw = this.screenSize.x * 0.5;
        const halfh = this.screenSize.y * 0.5;

        return new Vector2(
            (screenPosition.x - halfw) / Camera.tileSize,
            (-screenPosition.y + halfh) / Camera.tileSize
        );
    }

    // 뷰 행렬을 만들어서 돌려줍니다.
    view() { return this.transform.invWorldTRS(); }

    // 카메라의 설정을 바탕으로, 원근투영 행렬을 만들어냅니다.
    perspective() {
        const d = 1 / Math.tan(this.fov * MyMath.deg2rad * 0.5);
        const a = this.aspectRatio;
 
        const nearMinusFar = this.zNear - this.zFar;
        const nearPlusFar  = this.zNear + this.zFar;
 
        const l = -this.zNear + (nearPlusFar / nearMinusFar) * this.zNear;
        const k = -(nearPlusFar) / nearMinusFar;
 
        return new Matrix4x4(
            new Vector4(d/a, 0, 0, 0),
            new Vector4(0, d, 0, 0),
            new Vector4(0, 0, k, 1),
            new Vector4(0, 0, l, 0)
        );
    }


    // 클립 좌표를 NDC 좌표로 변경합니다.
    clipToNDC(p) {

        if(p.w==0) {
            p.w = Number.EPSILON;
        }
        const invW = 1 / p.w;
        return p.mul(invW);
    }


    // NDC 좌표에 종횡비를 곱하여 화면 크기만큼 늘려줍니다.
    stretchNDC(p) {
        const halfw = this.screenSize.x * 0.5 / Camera.tileSize;
        const halfh = this.screenSize.y * 0.5 / Camera.tileSize;
        return new Vector3(p.x * halfw, p.y * halfh, p.z);
    }

    // 카메라의 종횡비를 돌려줍니다. 종횡비는 w * a = h 의 a 를 의미합니다.
    get aspectRatio() {  return this.screenSize.x / this.screenSize.y; }
};


export class GameObject {
   static #instances = [];

   transform = null; 
   renderer  = null;
   update    = null; 

   useFrustumCulling = true; // 절두체 컬링을 적용할지 여부

   // 게임 오브젝트를 하나 생성합니다.
   static instantiate(gameObject=null) {
       const newInst = new GameObject();
       newInst.renderer = new Renderer();

       if(gameObject!=null) {
          newInst.transform = gameObject.transform.clone();
          newInst.renderer.mesh = gameObject.renderer.mesh;
          newInst.renderer.mainTexture = gameObject.renderer.mainTexture;
       }
       else {
          newInst.transform = new Transform();
       }
       GameObject.#instances.push(newInst);
       return newInst;
   }


   // 게임 오브젝트를 파괴합니다.
   static destroy(gameObject) {
       const index = GameObject.#instances.indexOf(gameObject);

       if(index > -1) {
            GameObject.#instances.splice(index, 1);
       }
   }


   // 게임 오브젝트들을 갱신합니다.
   static update() { 
       for(const gameObject of GameObject.#instances) {
           
           if(gameObject.update != null) {
               gameObject.update();
           }
       }
   }


   // 메인 카메라로 게임 오브젝트들을 렌더링합니다.
   static render() {
       const mainCamera = Camera.mainCamera;
       const screenSize = mainCamera.screenSize.x * mainCamera.screenSize.y;
       mainCamera.depthBuffer = new Array(screenSize);
       mainCamera.depthBuffer.fill(Infinity);

       for(const gameObject of GameObject.#instances) {

            if(gameObject.renderer.mesh == null) { // 렌더링할 mesh 가 없다면, 스킵한다.
                continue;
            }
            const camera      = gameObject.renderer.camera;
            const view        = camera.view();
            const model       = gameObject.transform.model();
            const perspective = camera.perspective();
            const finalMat    = model.mulMat(view, perspective);

            const frustum  = new MyMath.Frustum(finalMat);
            const mesh     = gameObject.renderer.mesh;
            const collider = mesh.collider;

            // 절두체 컬링. view 행렬을 적용한 위치를 대상으로 진행
            if(this.useFrustumCulling && collider!=null && collider.checkBoundFrustum(frustum)==MyMath.Bound.Outside) {
                continue;
            }
            gameObject.renderer.drawMesh(finalMat);

            // 매시의 콜라이더가 존재하고, 콜라이더 표시를 해야 하는 경우.
            if(collider!=null && collider.visible) {
                mesh.collider.drawCollider(finalMat, frustum);
            }

            // 메시에 본이 존재하고, 본을 표시를 해야 하는 경우.
            if(mesh.type==MeshType.Skinned && mesh.boneVisible) {

                for(const [key, value] of Object.entries(mesh.bones)) {
                   value.drawBone(finalMat);
                }
            }
       }
   }

   // 생성된 게임 오브젝트들의 갯수
   static get instanceCount() { return GameObject.#instances.length; }
};


export class CircleCollider {
    static renderer = null;
    radius; center;
    visible = false;


    // mesh 를 감싸는 구체의 정보를 생성합니다.
    constructor(mesh) {
       let   center      = Vector3.zero;
       let   maxDistance = 0;
       const vertices    = mesh.vertices; 
       const vertexCount = mesh.vertexCount;

       for(let i=0; i<vertexCount; ++i) {
           center = center.add(vertices[i]);
       }
       center = center.mul(1/vertexCount);

       for(let i=0; i<vertexCount; ++i) {
           const distance = center.sub(vertices[i]).sqrMagnitude;

           if(distance > maxDistance) {
               maxDistance = distance;
           }
       }
       this.radius = Math.sqrt(maxDistance);
       this.center = center;

       // CircleCollider 인스턴스가 하나 이상 존재할 경우
       // 구체의 기즈모를 보여주기위한 렌더러를 생성합니다.
       if(CircleCollider.renderer==null) {
            const renderer   = CircleCollider.renderer = new Renderer();
            const mesh       = renderer.mesh           = new Mesh();
            let   startIndex = 0;

            mesh.vertices = [];
            mesh.uvs      = [new Vector4(1,0,0,1), new Vector4(0,1,0,1), new Vector4(0,0,1,1)];
            mesh.indices  = [];

            // Roll Plane
            for(let rad=0; rad<=MyMath.twoPI; rad+=MyMath.deg2rad * 15) {
                const sin = Math.sin(rad);
                const cos = Math.cos(rad);
                mesh.vertices.push(new Vector3(cos, -sin, -0.01).normalized);
                mesh.vertices.push(new Vector3(cos, -sin, 0.01).normalized);
            }
            mesh.vertices.push(mesh.vertices[0]);
            mesh.vertices.push(mesh.vertices[1]);

            for(let i=0; i<mesh.vertexCount-2; i+=2) {
                mesh.indices.push(i); mesh.indices.push(i+1); mesh.indices.push(i+2);
                mesh.indices.push(1); mesh.indices.push(1);   mesh.indices.push(1);

                mesh.indices.push(i+1); mesh.indices.push(i+2); mesh.indices.push(i+3);
                mesh.indices.push(1); mesh.indices.push(1);   mesh.indices.push(1);
            }
            startIndex = mesh.vertexCount;


            // Yaw Plane
            for(let rad=0; rad<=MyMath.twoPI; rad+=MyMath.deg2rad * 15) {
                const sin = Math.sin(rad);
                const cos = Math.cos(rad);
                mesh.vertices.push(new Vector3(-sin, -0.01, cos) );
                mesh.vertices.push(new Vector3(-sin, 0.01, cos) );
            }
            mesh.vertices.push(mesh.vertices[startIndex]);
            mesh.vertices.push(mesh.vertices[startIndex+1]);
            
            for(let i=startIndex; i<mesh.vertexCount-4; i+=2) {
                mesh.indices.push(i); mesh.indices.push(i+1); mesh.indices.push(i+2);
                mesh.indices.push(0); mesh.indices.push(0);   mesh.indices.push(0);

                mesh.indices.push(i+1); mesh.indices.push(i+2); mesh.indices.push(i+3);
                mesh.indices.push(0); mesh.indices.push(0);   mesh.indices.push(0);
            }
            startIndex = mesh.vertexCount;


            // Pitch Plane
            for(let rad=0; rad<=MyMath.twoPI; rad+=MyMath.deg2rad * 15) {
                const sin = Math.sin(rad);
                const cos = Math.cos(rad);
                mesh.vertices.push(new Vector3(-0.01, cos, -sin) );
                mesh.vertices.push(new Vector3(0.01, cos, -sin) );
            }
            mesh.vertices.push(mesh.vertices[startIndex]);
            mesh.vertices.push(mesh.vertices[startIndex+1]);
            
            for(let i=startIndex; i<mesh.vertexCount-4; i+=2) {
                mesh.indices.push(i); mesh.indices.push(i+1); mesh.indices.push(i+2);
                mesh.indices.push(2); mesh.indices.push(2);   mesh.indices.push(2);

                mesh.indices.push(i+1); mesh.indices.push(i+2); mesh.indices.push(i+3);
                mesh.indices.push(2); mesh.indices.push(2);   mesh.indices.push(2);
            }
            
            renderer.backfaceCulling = false;
            renderer.wireFrameMode   = false;
            renderer.fragmentShader = (uv,pos)=>{ return new Color(uv.x, uv.y, uv.z, uv.w); }
       }
    }


    // 콜라이더를 그립니다.
    drawCollider(finalMat, frustum) {
 
        const circleModel = new Matrix4x4(
            new Vector4(this.radius, 0, 0, 0),
            new Vector4(0, this.radius, 0, 0),
            new Vector4(0, 0, this.radius, 0),
            this.center.toVector4(1)
        );
        finalMat = circleModel.mulMat(finalMat); // 원의 정점들을 모두 반지름부터 먼저 늘려주고, 중심점만큼 옮겨준다.
        CircleCollider.renderer.drawMesh(finalMat);
    }


    // 콜라이더와 평면 사이의 거리를 계산합니다.
    checkBoundFrustum(frustum) {
        let intersectCount = 0;

        for(const plane of frustum.planes) {
            const distance = plane.distance(this.center); // 결과는 양수 또는 음수

            if(distance > this.radius) {
                return MyMath.Bound.Outside; // 중심점이 평면보다 `this.radius` 만큼 거리가 있을 경우, 원은 바깥에 있다.
            }
            if(Math.abs(distance) <= this.radius) { // 거리를 절댓값보고 봤을 때, this.radius 보다 작거나 같으면 원은 평면과 겹쳐있다.
                intersectCount++;                   // 다만, 다른 평면들의 밖에 있을 가능성때문에 카운트만 증가시킨다.
            } 
        }

        // 하나라도 교차하는 평면이 있었다면, 원은 절두체와 교차한다.
        if(intersectCount > 0) {
            return MyMath.Bound.Intersect;
        }
        return MyMath.Bound.Inside;
    }
};


export class BoxCollider {
    static renderer = null;
    min; max;


    // mesh 를 감싸는 박스의 정보를 생성합니다.
    constructor(mesh) {
        const vertices    = mesh.vertices;
        const vertexCount = mesh.vertexCount;

        this.min = new Vector3(Infinity, Infinity, Infinity);
        this.max = new Vector3(-Infinity, -Infinity, -Infinity);
        
        for(let i=0; i<vertexCount; ++i) {
            const position = vertices[i];

            if(position.x < this.min.x) this.min.x = position.x;
            if(position.x > this.max.x) this.max.x = position.x;

            if(position.y < this.min.y) this.min.y = position.y;
            if(position.y > this.max.y) this.max.y = position.y;

            if(position.z < this.min.z) this.min.z = position.z;
            if(position.z > this.max.z) this.max.z = position.z;
        }

        
        // BoxCollider 인스턴스가 하나 이상 존재할 경우
        // 박스의 기즈모를 보여주기위한 렌더러를 생성합니다.
        if(BoxCollider.renderer==null) {
            const renderer = BoxCollider.renderer      = new Renderer();
            const mesh     = BoxCollider.renderer.mesh = new Mesh();
            const d        = 0.02;

            mesh.vertices = [
                new Vector3(-1, 1, -1), // 0
                new Vector3(1, 1, -1),  // 1
                new Vector3(1, -1, -1), // 2
                new Vector3(-1,-1, -1), // 3

                new Vector3(-1,1, 1), // 4
                new Vector3(1,1,1),   // 5
                new Vector3(1,-1,1),  // 6
                new Vector3(-1,-1,1), // 7

                // for 0
                new Vector3(-1+d,1,-1), // 8
                new Vector3(-1,1-d,-1), // 9
                new Vector3(-1,1,-1+d), // 10

                // for 1
                new Vector3(1-d, 1, -1), // 11
                new Vector3(1, 1-d, -1), // 12
                new Vector3(1, 1, -1+d), // 13

                // for 2
                new Vector3(1-d, -1, -1), // 14
                new Vector3(1, -1+d, -1), // 15
                new Vector3(1, -1, -1+d), // 16

                // for 3
                new Vector3(-1+d,-1, -1), // 17
                new Vector3(-1,-1+d, -1), // 18
                new Vector3(-1,-1, -1+d), // 19

                // for 4
                new Vector3(-1+d,1, 1), // 20
                new Vector3(-1,1-d, 1), // 21
                new Vector3(-1,1, 1-d), // 22

                // for 5
                new Vector3(1-d,1,1), // 23
                new Vector3(1,1-d,1), // 24
                new Vector3(1,1,1-d), // 25

                // for 6
                new Vector3(1-d,-1,1), // 26
                new Vector3(1,-1+d,1), // 27
                new Vector3(1,-1,1-d), // 28

                // for 7
                new Vector3(-1+d,-1,1), // 29
                new Vector3(-1,-1+d,1), // 30
                new Vector3(-1,-1,1-d), // 31
            ];
            mesh.uvs = [Vector2.zero];
            mesh.indices = [

                // 정면
                0,8,3, 0,0,0,
                3,8,17, 0,0,0, 

                0,1,9, 0,0,0,
                9,1,12, 0,0,0,

                1,2,14, 0,0,0,
                14,1,11, 0,0,0,

                3,2,18, 0,0,0,
                18,2,15, 0,0,0,


                // 좌측
                0,3,10, 0,0,0,
                10,3,19, 0,0,0,

                0,4,21, 0,0,0,
                21,0,9, 0,0,0,

                4,7,22, 0,0,0,
                22,7,31, 0,0,0,

                3,7,18, 0,0,0,
                18,7,30, 0,0,0,


                // 후면
                4,5,24, 0,0,0,
                24,4,21, 0,0,0,

                4,7,29, 0,0,0,
                29,4,20, 0,0,0,

                7,6,27, 0,0,0,
                27,7,30, 0,0,0,

                5,6,26, 0,0,0,
                26,5,23, 0,0,0,


                // 우측
                1,5,24, 0,0,0,
                24,1,12, 0,0,0,

                1,2,16, 0,0,0,
                16,1,13, 0,0,0,

                5,6,28, 0,0,0,
                28,5,25, 0,0,0,

                2,6,27, 0,0,0,
                27,2,15, 0,0,0,


                // 위
                0,4,20, 0,0,0,
                20,0,8, 0,0,0,

                4,5,25, 0,0,0,
                25,4,22, 0,0,0,

                1,5,23, 0,0,0,
                23,1,11, 0,0,0,

                0,1,13, 0,0,0,
                13,0,10, 0,0,0,


                // 아래
                3,7,29, 0,0,0,
                29,3,17, 0,0,0,
                
                7,6,28, 0,0,0,
                28,7,31, 0,0,0,

                2,6,26, 0,0,0,
                26,2,14, 0,0,0,

                2,3,19, 0,0,0,
                19,2,16, 0,0,0,
            ];

            renderer.fragmentShader  = (uv, pos)=>{ return Color.green; };
            renderer.backfaceCulling = false;
            renderer.wireFrameMode   = false;
        }
    }


    // 콜라이더를 그립니다.
    drawCollider(finalMat, frustum) {
        const xScale = (this.max.x - this.min.x) * 0.5;
        const yScale = (this.max.y - this.min.y) * 0.5;
        const zScale = (this.max.z - this.min.z) * 0.5;

        const center = this.min.mul(0.5).add(
            this.max.mul(0.5)
        );
        const scale = new MyMath.Matrix4x4(
            new Vector4(xScale, 0,0,0),
            new Vector4(0,yScale,0,0),
            new Vector4(0,0,zScale,0),
            center.toVector4(1)
        );
        finalMat = scale.mulMat(finalMat);
        BoxCollider.renderer.drawMesh(finalMat);
    }


    // 콜라이더와 평면 사이의 거리를 계산합니다.
    checkBoundFrustum(frustum) {
        let intersectCount = 0;
        
        for(const plane of frustum.planes) {
            const p    = this.max.clone();
            const pNeg = this.min.clone();

            if(plane.normal.x > 0) { p.x = this.min.x; pNeg.x = this.max.x; }
            if(plane.normal.y > 0) { p.y = this.min.y; pNeg.y = this.max.y; } 
            if(plane.normal.z > 0) { p.z = this.min.z; pNeg.z = this.max.y; }

            if(plane.distance(p) > 0) {
                return MyMath.Bound.Outside;
            }
            if(plane.distance(pNeg) >= 0) {
                intersectCount++;
            }
        }

        if(intersectCount>0) {
            return MyMath.Bound.Intersect;
        }
        return MyMath.Bound.Inside;
    }
};


export class Bone {
    static renderer = null;

    bindPose   = null;            // 본의 최초 트랜스폼.
    $transform = null;            // 본의 트랜스폼.
    boneType   = BoneType.Static; // 본이 정적(Static) 또는 동적(Dynamic) 인지 알려줍니다.

    #parent = null; // 자신의 부모 본
    #childs = [];   // 자신의 자식들의 목록

    boneColor = Color.black; // 본의 색깔을 지정

    // 루트 본을 생성합니다. 
    constructor(position=Vector3.zero, scale=Vector3.one, rotation=Vector3.zero) {
        this.bindPose = {
            scale    : scale,
            position : position,
            rotation : rotation
        };
        this.$transform = new Transform(position, scale, rotation);


        // 본을 표시하기 위한, 메시를 생성합니다. 최초 한번만 생성합니다.
        if(Bone.renderer==null) {
            const renderer = Bone.renderer      = new Renderer();
            const mesh     = Bone.renderer.mesh = new Mesh();

            const bigCircle   = [];
            const smallCircle = [];

            mesh.vertices = [];
            mesh.uvs      = [Vector3.zero];
            mesh.indices  = [];


            // (1,0,0) 을 회전시켜 정점들을 얻어낸다.
            for(let rad=0; rad<=MyMath.twoPI+1; rad+=30*MyMath.deg2rad) {
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const p = new Vector3(c, 0, -s);

                bigCircle.push(p.mul(0.3));
                smallCircle.push(p.mul(0.15));
            }

            // `bigCircle` 의 정점들을 모두 푸시
            mesh.vertices.push(new Vector3(0, 1, 0) );
            for(let i=0; i<bigCircle.length; ++i) mesh.vertices.push(bigCircle[i].add(Vector3.up.mul(0.7)) );


            // 화살표 머리의 뿔 부분
            for(let i=1; i<mesh.vertices.length-1; ++i) {
                mesh.indices.push(0); mesh.indices.push(i); mesh.indices.push(i+1); // for vertex
                mesh.indices.push(0); mesh.indices.push(0); mesh.indices.push(0);   // for uv
            }

            mesh.vertices.push(new Vector3(0, 0.7, 0));
            const origin = mesh.vertices.length-1;


            // 화살표 머리의 바닥 부분
            for(let i=1; i<mesh.vertices.length-2; ++i) {
                mesh.indices.push(i+1); mesh.indices.push(i); mesh.indices.push(origin); // for vertex
                mesh.indices.push(0); mesh.indices.push(0); mesh.indices.push(0);   // for uv
            }


            // `smallCircle` 의 정점들을 모두 푸시
            for(let i=0; i<smallCircle.length; ++i) mesh.vertices.push(smallCircle[i].add(Vector3.up.mul(0.7)) );
            for(let i=0; i<smallCircle.length; ++i) mesh.vertices.push(smallCircle[i] );

            const offset = smallCircle.length;
           
            // 화살표 몸통의 기둥 부분
            for(let i=origin+1; i<origin+offset-1; ++i) {
                mesh.indices.push(i+1+offset); mesh.indices.push(i+1); mesh.indices.push(i);
                mesh.indices.push(0); mesh.indices.push(0); mesh.indices.push(0);

                mesh.indices.push(i+1+offset); mesh.indices.push(i); mesh.indices.push(i+offset);
                mesh.indices.push(0); mesh.indices.push(0); mesh.indices.push(0);
            }

            mesh.vertices.push(new Vector3(0, 0, 0) );
            const end = mesh.vertices.length-1;

            // 화살표 몸통의 바닥 부분
            for(let i=origin+offset+1; i<mesh.vertices.length-1; ++i) {
                mesh.indices.push(i+1); mesh.indices.push(i); mesh.indices.push(end);
                mesh.indices.push(0); mesh.indices.push(0); mesh.indices.push(0);
            }

            
            // 화살표는 빨간색으로 출력
            mesh.collider = new BoxCollider(mesh);
            renderer.fragmentShader = (uv,pos)=>{ return new Color(255, 0, 0, 1); };
            renderer.wireFrameMode  = true;
        }
    }

    // 본의 스켈레탈 애니메이션을 적용하는 행렬을 돌려줍니다. 스켈레탈 애니메이션을 적용하기 위해,
    // bindPose^(-1) 을 적용하여 로컬 공간으로 이동시킵니다. 이후, parent.worldTransform * this.localTransform
    // 을 적용하는 순서를 가집니다. 
    skeletal() {
        const pose = this.bindPose;

        const invBindPose = Transform.invTRS(pose.position, pose.scale, pose.rotation);
        const local       = this.$transform.model();
        return invBindPose.mulMat(local);
    }


    // 본을 그립니다. 화살표는 부모로부터 자신을 가리키도록 그려집니다. 또한,
    // 그려진 본은 최초 바인딩 포즈로만 그려집니다.
    drawBone(finalMat) {
        const parent = this.#parent;

        if(this.#parent!=null) {
            const pose0 = this.bindPose;
            const pose1 = parent.bindPose;

            const diff   = pose0.position.sub(pose1.position);
            const length = diff.magnitude;
            const lookAt = diff.normalized;
            const axis   = Vector3.cross(Vector3.up, lookAt);

            const acosInput = MyMath.clamp(Vector3.dot(lookAt, Vector3.up), -1, 1);
            let   angle     = Math.acos(acosInput) * MyMath.rad2deg;

            const scale = new Matrix4x4(
               new Vector4(1, 0, 0, 0),
               new Vector4(0, length, 0, 0),
               new Vector4(0, 0, 1, 0),
               new Vector4(0, 0, 0, 1)
            );
            const rotate   = Transform.rodrigues(axis, angle);
            const translate = new Matrix4x4(
                new Vector4(1, 0, 0, 0),
                new Vector4(0, 1, 0, 0),
                new Vector4(0, 0, 1, 0),
                diff.mul(-1).toVector4()
            ); 

            const bindPose = Transform.TRS(pose0.position, pose0.scale, pose0.rotation);
            finalMat = scale.mulMat(rotate, translate, bindPose, finalMat);

            Bone.renderer.wireFrameColor = this.boneColor;
            Bone.renderer.drawMesh(finalMat);
        }
    }


    // 자식을 추가합니다.
    addChild(bone) {
        const index = this.#childs.indexOf(bone);

        if(index < 0) {
            this.#childs.push(bone);
            this.$transform.addChild(bone.$transform);
        }
    }


    // 자식을 제거합니다.
    removeChild(bone) {
        const index = this.#childs.indexOf(bone);

        if(index > -1) {
            this.#childs.splice(index,1);
            this.$transform.removeChild(bone.$transform);
        }
    }


    // 본의 트랜스폼이 수정되었음을 모든 자식들에게 알립니다.
    // 모든 자식 본들은 Dynamic 타입의 본이 됩니다.
    #setDirty() {
        
        if(this.boneType == BoneType.Static) {
            this.boneType = BoneType.Dynamic;

            for(let i=0; i<this.#childs.length; ++i) {
                const child = this.#childs[i];
                child.#setDirty();
            }
        }
    }


    // 본의 부모를 지정합니다. 
    get parent() { return this.#parent; }
    set parent(bone=null) {
        
        if(bone == null) {
            bone.removeChild(this);
        }
        else {
            bone.addChild(this);
        }
    }

    // 본의 회전량을 수정하거나 얻습니다.
    get localRotation() { return this.$transform.localRotation; }
    set localRotation(newRotation) {
        this.#setDirty();
        this.$transform.localRotation = newRotation;
    }

    // 본의 크기를 수정하거나 얻습니다.
    get localScale() { return this.$transform.localScale; }
    set localScale(newScale) {
        this.#setDirty();
        this.$transform.localScale = newScale;
    }

    // 본의 위치를 수정하거나 얻습니다.
    get position() { return this.$transform.position; }
    set position(newPosition) {
        this.#setDirty();
        this.$transform.position = newPosition;
    }
};
