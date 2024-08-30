import {Vector2, Vector3, Vector4, Matrix4x4, Frustum, Bound, Quaternion} from "./MyMath.js";
import * as MyMath from "./MyMath.js";
import {Renderer, Mesh, Color, MeshType, Texture, Material} from "./Renderer.js";

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

const KeyState = {
    KeyDown  : 1,
    KeyPress : 2,
    KeyUp    : 4,
    Dirty    : 8,
    None     : 16,
};

export const RotationOrder = {
    EULER_XYZ : 0, // R = roll * yaw * pitch
    EULER_XZY : 1, // R = yaw * roll * pitch
    EULER_YZX : 2, // R = pitch * roll * yaw
    EULER_YXZ : 3, // R = roll * pitch * yaw (default)
    EULER_ZXY : 4, // R = yaw * pitch * roll
    EULER_ZYX : 5, // R = pitch * yaw * roll
};

export const WrapMode = {
    Once         : 0, // 
    Loop         : 1, // 
    PingPong     : 2, // 
    Default      : 3, // 
    ClampForever : 4  // 
};

export const InterpolationType = {
    Constant : (1 << 1), // 0x2. AnimationCurve.constant() 를 사용하여 보간합니다.
    Linear   : (1 << 2), // 0x4. AnimationCurve.linear() 를 사용하여 보간합니다.
    Cubic    : (1 << 3)  // 0x8. AnimationCurve.bezier() 를 사용하여 보간합니다.
};

export const TangentMode = {
    Auto                    : (1 << 8),              // 0x100. Spline cardinal
    TCB                     : (1 << 9),              // 0x200. Spline TCB (Tension, Continuity, Bias)
    User                    : (1 << 10),             // 0x400. rightSlope == nextLeftSlope
    Break                   : (1 << 11),             // 0x800. rightSlope != nextLeftSlope
    GenericClamp            : (1 << 12),             // 0x1000. 
    GenericTimeIndependent  : (1 << 13),             // 0x2000.
    GenericClampProgressive : (1 << 14) | (1 << 13), // 0x6000.

    AutoBreak     : (1 << 8) | (1 << 11),
    AutoUserBreak : (1 << 8) | (1 << 10) | (1 << 11)
};

export const ConstantMode = {
    Standard : 0,        // 0x0.
    Next     : (1 << 2), // 0x100.
};

export const WeightedMode = {
    Right    : (1 << 24), // 0x1000000. 우측 기울기(right tangent)의 가중치가 주어짐.
    NextLeft : (1 << 25), // 0x2000000. 좌측 기울기(left tangent)의 가중치가 주어짐.
};

export const VelocityMode = {
    Right    : (1 << 28),
    NextLeft : (1 << 29)
};

export const KeyDataIndex = {
    RightSlope       : 0, // 현재 키의 우측 접선의 기울기(the right derivative)의 인덱스 (TangentMode.User | TangentMode.Break | TangentMode.Auto)
    NextLeftSlope    : 1, // 다음 키의 좌측 접선의 기울기(the left derivative)의 인덱스 (TangentMode.User | TangentMode.Break | TangentMode.Auto)
    RightWeight      : 2, // 현재 키의 control point 의 x 값의 가중치의 인덱스 (WeightedMode.Right)
    NextLeftWeight   : 3, // 다음 키의 control point 의 x 값의 가중치의 인덱스 (WeightedMode.NextLeft) 
    RightVelocity    : 4, // 
    NextLeftVelocity : 5, //

    TCBTension       : 0, // Tension 값의 인덱스 (TangentMode.TCB)
    TCBContinuity    : 1, // Continuity 값의 인덱스 (TangentMode.TCB)
    TCBBias          : 2, // Bias 값의 인덱스 (TangentMode.TCB)
};

export const PropertyType = {
    Quaternion : 0, // setter = (q)=>{...}, xcurve, ycurve, zcurve 를 인자로 필요로 합니다.
    Vector2    : 1, // setter = (xy)=>{...}, xcurve, ycurve 를 인자로 필요로 합니다.
    Vector3    : 2, // setter = (xyz)=>{...}, xcurve, ycurve, zcurve 를 인자로 필요로 합니다.
    Vector4    : 3, // setter = (xyzw)=>{...}, xcurve, ycurve, zcurve, wcurve 를 인자로 필요로 합니다.
    Number     : 4, // setter = (n)=>{...}, ncurve 를 인자로 필요로 합니다.
};

export const ktime2sec = 1/46186158000; // FBX 파일의 KTime 을 second 로 변환합니다.



export class GameEngine {
    static #prevTimestamp = 0;
    static #curTimestamp  = 0;

    static #inputState = [];
    static #inputQueue = [];

    static #textQueue  = [];
    static #backBuffer = null;

    static rotationOrder = RotationOrder.EULER_YXZ; // 기본 회전 순서는 yaw - pitch - roll

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
        // GameEngine.$ctx.fillStyle = color.toString();
        // GameEngine.$ctx.fillRect(screenPoint.x, screenPoint.y, 1,1);

        const index = (screenPoint.y * GameEngine.$cvs.width * 4) + (screenPoint.x * 4);
        const data  = GameEngine.#backBuffer.data;

        data[index]   = color.r * 255;
        data[index+1] = color.g * 255;
        data[index+2] = color.b * 255;
        data[index+3] = color.a * 255;
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
    static #temp0 = new Quaternion(); // Quaternion
    static #temp1 = new Vector3();    // Vector3
    static #temp2 = new Matrix4x4();  // Matrix4x4
    static #temp3 = new Matrix4x4();  // Matrix4x4
    static #temp4 = new Matrix4x4();  // Matrix4x4

    #localPosition; // Vector3
    #localScale;    // Vector3
    #localRotation; // Quaternion
    
    #worldPosition; // Vector3
    #worldScale;    // Vector3
    #worldRotation; // Quaternion
    
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
    // Quaternion 입니다.
    static TRS(position, scale, rotation) {

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = rotation.toMatrix4x4();
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
        const invR = Quaternion.euler(rotation).conjugate.toMatrix4x4(); // q*
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
        const R = this.#worldRotation.conjugate.toMatrix4x4(); // q*
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.mul(-1).toVector4()
        );
        return T.mulMat(R,S);
    }


    // `localTransform` 으로 TRS 행렬을 만들어 돌려줍니다.
    localTRS() {
        const scale    = this.#localScale;
        const position = this.#localPosition;

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = this.#localRotation.toMatrix4x4();
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.toVector4()
        );
        return S.mulMat(R,T);
    }
    

    // this.localTransform * parent.worldTransform = this.worldTransform.
    // 부모의 `worldTransform` 과 자신의 `localTransform` 을 사용하여,
    // 자신의 `worldTransform` 을 갱신합니다. 또한 자신의 월드 트랜스폼이
    // 수정되었으므로, 모든 자식들의 월드 트랜스폼 또한 수정되어야 합니다.
    calculateWorld() {
        const parent = this.#parent;

        const s0 = this.#localScale;
        const q0 = this.#localRotation;
        const t0 = this.#localPosition;

        if(this.#parent != null) {
            const s1 = parent.#worldScale;
            const q1 = parent.#worldRotation;
            const t1 = parent.worldPosition;

            s0.mulVectorNonAlloc(this.#worldScale, s1);  // this.worldScale    = s0 * s1
            q0.mulQuatNonAlloc(this.#worldRotation, q1); // this.worldRotation = q1 * q0

            const temp0 = q1.mulVectorNonAlloc(this.#worldPosition, t0); // this.worldPosition = (q1 * t0)
            const temp1 = temp0.mulVectorNonAlloc(temp0, s1);            // this.worldPosition = (q1 * t0) * s1
            
            temp1.addNonAlloc(temp1, t1); // this.worldPosition = (q1 * t0) * s1 + t1
        }
        else {
            this.#worldScale.assignVector(s0);
            this.#worldRotation.assignQuat(q0);
            this.#worldPosition.assignVector(t0);
        }

        for(const child of this.#childs) {
            child.calculateWorld();
        }
    }


    // this.localTransform = this.worldTransform * parent.worldTransform^(-1).
    // 자신의 `worldTransform` 과 부모의 `worldTransform` 을 사용하여,
    // 자신의 `localTransform` 을 갱신합니다. 여기서 자식들의 월드 트랜스폼이
    // 수정될 필요는 없습니다. 자신의 월드 트랜스폼은 동일하기 때문입니다.
    calculateLocal() {
        const parent = this.#parent;

        const s0 = this.#worldScale;
        const q0 = this.#worldRotation;
        const t0 = this.#worldPosition;

        if(this.#parent != null) {
            const invS1 = Transform.#temp1.assign(
                1/parent.#worldScale.x, 
                1/parent.#worldScale.y,
                1/parent.#worldScale.z
            );
            const invQ1 = parent.#worldRotation.conjugateNonAlloc(Transform.#temp0);
            const t1    = parent.#worldPosition;

            s0.mulVectorNonAlloc(this.#localScale, invS1);  // this.localScale = s0 * s1^(-1)
            q0.mulQuatNonAlloc(this.#localRotation, invQ1); // this.localRotation = q0 * q1&(-1)

            const temp0 = t0.subNonAlloc(this.#localPosition, t1); // this.localPosition = (t0 - t1)
            const temp1 = temp0.mulVectorNonAlloc(temp0, invS1);   // this.localPosition = (t0 - t1) * s^(-1)
            
            invQ1.mulVectorNonAlloc(temp1, temp1); // invQ1 * ((t0-t1) * invS1)
            return;
        }
        this.#localPosition.assignVector(t0);
        this.#localRotation.assignQuat(q0);
        this.#localScale.assignVector(s0);
    }


    // 루트 트랜스폼을 생성합니다. 생성된 트랜스폼은 어떠한 부모나 자식도 가지고 있지 않습니다.
    // rotation 은 Vector3 또는 Quaternion 을 인자로 줄 수 있습니다.
    constructor(position=Vector3.zero, scale=Vector3.one, rotation=Vector3.zero) {
        this.#localPosition = position.clone(); // Vector3
        this.#localScale    = scale.clone();    // Vector3
        
        this.#worldPosition = position.clone(); // Vector3
        this.#worldScale    = scale.clone();    // Vector3
        
        if(rotation.v == undefined) {
            this.#localRotation = Quaternion.euler(rotation); // Quaternion
            this.#worldRotation = this.#localRotation.clone(); // Quaternion
        }
        else {
            this.#localRotation = rotation.clone(); // Quaternion
            this.#worldRotation = rotation.clone(); // Quaternion
        }
    }


    // 해당 트랜스폼을 나타내는 문자열을 돌려줍니다.
    toString() {
       const localInfo = `\nlocalScale : ${this.#localScale}\n\nlocalRotation : ${this.#localRotation}\n\nlocalPosition : ${this.#localPosition}\n\n`;
       const worldInfo = `\nworldScale : ${this.#worldScale}\n\nworldRotation : ${this.#worldRotation}\n\nworldPosition : ${this.#worldPosition}\n`;
       return localInfo+worldInfo;
    }


    // 모델링 행렬를 얻습니다. model = parent.worldTransform * this.localTransform 을 수행합니다.
    // 즉 이 함수는 원래 이름이 worldTRS 인 함수라고도 생각할 수 있습니다.
    model() { 
        const scale    = this.#worldScale;
        const position = this.#worldPosition;

        const S = new Matrix4x4(
            new Vector4(scale.x, 0, 0, 0),
            new Vector4(0, scale.y, 0, 0),
            new Vector4(0, 0, scale.z, 0),
            new Vector4(0, 0, 0, 1)
        );
        const R = this.#worldRotation.toMatrix4x4();
        const T = new Matrix4x4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            position.toVector4()
        );
        return S.mulMat(R, T);
    }
    

    // `localScale`, `localRotation`, `localPosition` 를 한번에 설정합니다.
    // rotation 은 Vector3 또는 Quaternion 을 줄 수 있습니다.
    setLocalTransform(position=Vector3.zero, scale=Vector3.one, rotation=Vector3.zero) {
        this.#localScale.assignVector(scale);
        this.#localPosition.assignVector(position);
        
        if(rotation.v == undefined) {
            Quaternion.eulerNonAlloc(this.#localRotation, rotation);
        }
        else {
            this.#localRotation.assignQuat(rotation);
        }
        
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
        this.#localScale.assignVector(newScale);
        this.calculateWorld();
    }


    // `localRotation` 을 수정하거나 얻습니다. `localTransform` 이 변경되므로, 자신과 자신의 모든
    // 자식들의 `worldTransform` 은 수정됩니다. 인자는 사원수입니다. 직관적인 인터페이스를 원한다면
    // Quaternion.euler() 함수를 사용하시길 바랍니다.
    get localRotation() { return this.#localRotation.clone(); }
    set localRotation(newQuat) { 
        this.#localRotation.assignQuat(newQuat);
        this.calculateWorld();
    }


    // `localPosition` 을 수정하거나 얻습니다. `localTransform` 이 변경되므로, 자신과 자신의 모든
    // 자식들의 `worldTransform` 은 수정됩니다.
    get position() { return this.#localPosition.clone(); }
    set position(newPosition) {
        this.#localPosition.assignVector(newPosition);
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

    // `worldScale` 을 수정하거나 얻습니다. `worldTransform` 이 변경되므로, 자신의 localTransform
    // 과 자신의 자식들의 localTransform 은 재계산되어야 합니다.
    get worldScale() { return this.#worldScale.clone(); }
    set worldScale(newScale) {
        this.#worldScale.assignVector(newScale);
        this.calculateLocal();

        for(const child of this.#childs) {
            child.calculateLocal();
        }
    }
    
    // `worldPosition` 을 얻습니다. `worldTransform` 이 변경되므로, 자신의 localTransform
    // 과 자신의 자식들의 localTransform 은 재계산되어야 합니다.
    get worldPosition() { return this.#worldPosition.clone(); }
    set worldPosition(newPosition) {
        this.#worldPosition.assignVector(newPosition);
        this.calculateLocal();

        for(const child of this.#childs) {
            child.calculateLocal();
        }
    }

    // `worldRotation` 을 얻습니다. `worldTransform` 이 변경되므로, 자신의 localTransform
    // 과 자신의 자식들의 localTransform 은 재계산되어야 합니다.
    get worldRotation() { return this.#worldRotation.clone(); }
    set worldRotation(newQuat) {
        this.#worldRotation.assignQuat(newQuat);
        this.calculateLocal();

        for(const child of this.#childs) {
            child.calculateLocal();
        }
    }

    /***************
     * for optimizing
     ***************/

    // invTRS() 와 같되, 결과를 out 으로 출력합니다.
    static invTRSNonAlloc(out, position, scale, rotation) {
        const invS = Transform.#temp2;
        const invR = Transform.#temp3;
        const invT = Transform.#temp4;

        invS.basisX.assign(1/scale.x, 0, 0, 0);
        invS.basisY.assign(0, 1/scale.y, 0, 0);
        invS.basisZ.assign(0, 0, 1/scale.z, 0);
        invS.basisW.assign(0,0,0,1);

        const q    = rotation;
        const invQ = q.conjugateNonAlloc(Transform.#temp0); 
        invQ.toMatrix4x4NonAlloc(invR);

        invT.basisX.assign(1,0,0,0);
        invT.basisY.assign(0,1,0,0);
        invT.basisZ.assign(0,0,1,0);
        invT.basisW.assign(-position.x, -position.y, -position.z, 1);

        return invT.mulMatNonAlloc(out, invR, invS);
    }


    // model() 과 같되, 결과를 out 으로 출력합니다.
    modelNonAlloc(out) { 
        const scale    = this.#worldScale;
        const position = this.#worldPosition;
        const rotation = this.#worldRotation;

        const S = Transform.#temp2;
        const R = Transform.#temp3;
        const T = Transform.#temp4;

        S.basisX.assign(scale.x, 0, 0, 0);
        S.basisY.assign(0, scale.y, 0, 0);
        S.basisZ.assign(0, 0, scale.z, 0);
        S.basisW.assign(0, 0, 0, 1);

        rotation.toMatrix4x4NonAlloc(R);

        T.basisX.assign(1, 0, 0, 0);
        T.basisY.assign(0, 1, 0, 0);
        T.basisZ.assign(0, 0, 1, 0);
        T.basisW.assign(position.x, position.y, position.z, 1);

        return S.mulMatNonAlloc(out, R, T);
    }


    // invWorldTRS() 와 같되, 결과를 out에 저장합니다.
    invWorldTRSNonAlloc(out) {
        const scale    = this.#worldScale;
        const position = this.#worldPosition;
        const rotation = this.#worldRotation;

        const S = Transform.#temp2;
        const R = Transform.#temp3;
        const T = Transform.#temp4;

        S.basisX.assign(1/scale.x, 0, 0, 0);
        S.basisY.assign(0, 1/scale.y, 0, 0);
        S.basisZ.assign(0, 0, 1/scale.z, 0);
        S.basisW.assign(0, 0, 0, 1);

        const invQ = rotation.conjugateNonAlloc(Transform.#temp0);
        invQ.toMatrix4x4NonAlloc(R);

        T.basisX.assign(1,0,0,0);
        T.basisY.assign(0,1,0,0);
        T.basisZ.assign(0,0,1,0);
        T.basisW.assign(-position.x, -position.y, -position.z, 1);

        return T.mulMatNonAlloc(out, R, S);
    }


    // rodrigues() 와 같되, 결과를 out 에 저장합니다.
    static rodriguesNonAlloc(out, axis, angle) {
        angle = MyMath.deg2rad * angle;

        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const B   = 1-cos;
        const a   = axis.x;
        const b   = axis.y;
        const c   = axis.z;

        out.basisX.assign((cos+a*a*B),    (sin*c+b*a*B),  (sin*-b+c*a*B), 0);
        out.basisY.assign((sin*-c+a*b*B), (cos+b*b*B),    (sin*a+c*b*B),  0);
        out.basisZ.assign((sin*b+a*c*B),  (sin*-a+b*c*B), (cos+c*c*B),    0);
        out.basisW.assign(0,0,0,1);

        return out;
    }


    // TRS() 와 같되, 결과를 out 에 저장합니다.
    static TRSNonAlloc(out, position, scale, rotation) {
        const S = Transform.#temp2;
        const R = Transform.#temp3;
        const T = Transform.#temp4;

        S.basisX.assign(scale.x, 0, 0, 0);
        S.basisY.assign(0, scale.y, 0, 0);
        S.basisZ.assign(0, 0, scale.z, 0);
        S.basisW.assign(0, 0, 0, 1);

        const q = rotation;
        q.toMatrix4x4NonAlloc(R);

        T.basisX.assign(1, 0, 0, 0);
        T.basisY.assign(0, 1, 0, 0);
        T.basisZ.assign(0, 0, 1, 0);
        T.basisW.assign(position.x, position.y, position.z, 1);

        return S.mulMatNonAlloc(out, R, T);
    }
};


export class Camera {
    static mainCamera = new Camera();

    static tileSizeX = 20;
    static tileSizeY = 20;
    
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
            Math.round(worldPosition.x * Camera.tileSizeX + halfw),
            Math.round(-worldPosition.y * Camera.tileSizeY + halfh)
        );
    }


    // 스크린 좌표계를 데카르트 좌표계로 변경합니다.
    screenToWorld(screenPosition) {
        const halfw = this.screenSize.x * 0.5;
        const halfh = this.screenSize.y * 0.5;

        return new Vector2(
            (screenPosition.x - halfw) / Camera.tileSizeX,
            (-screenPosition.y + halfh) / Camera.tileSizeY
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
        const halfw = this.screenSize.x * 0.5 / Camera.tileSizeX;
        const halfh = this.screenSize.y * 0.5 / Camera.tileSizeY;
        return new Vector4(p.x * halfw, p.y * halfh, p.z);
    }

    // 카메라의 종횡비를 돌려줍니다. 종횡비는 w * a = h 의 a 를 의미합니다.
    get aspectRatio() {  return this.screenSize.x / this.screenSize.y; }


    /****************
     * for optimizing
     ***************/

    // perspective() 와 같되, out 에 결과를 저장합니다.
    perspectiveNonAlloc(out) {
        const d = 1 / Math.tan(this.fov * MyMath.deg2rad * 0.5);
        const a = this.aspectRatio;
 
        const nearMinusFar = this.zNear - this.zFar;
        const nearPlusFar  = this.zNear + this.zFar;
 
        const l = -this.zNear + (nearPlusFar / nearMinusFar) * this.zNear;
        const k = -(nearPlusFar) / nearMinusFar;

        out.basisX.assign(d/a, 0, 0, 0);
        out.basisY.assign(0, d, 0, 0);
        out.basisZ.assign(0, 0, k, 1);
        out.basisW.assign(0, 0, l, 0);

        return out;
    }


    // view() 와 같되, out 에 결과를 저장합니다.
    viewNonAlloc(out) { return this.transform.invWorldTRSNonAlloc(out); }
};


export class GameObject {
   static #instances = [];
   static #frustum   = new Frustum();

   static #temp0 = Matrix4x4.identity;
   static #temp1 = Matrix4x4.identity;
   static #temp2 = Matrix4x4.identity;

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
       
       if(mainCamera.depthBuffer == null) {
           mainCamera.depthBuffer = new Array(screenSize);
       }
       mainCamera.depthBuffer.fill(Infinity);

       for(const gameObject of GameObject.#instances) {

            if(gameObject.renderer.mesh == null) { // 렌더링할 mesh 가 없다면, 스킵한다.
                continue;
            }
            const camera      = gameObject.renderer.camera;
            const view        = camera.viewNonAlloc(GameObject.#temp0);
            const model       = gameObject.transform.modelNonAlloc(GameObject.#temp1);
            const perspective = camera.perspectiveNonAlloc(GameObject.#temp2);
            const finalMat    = model.mulMatNonAlloc(model, view, perspective);

            const frustum  = GameObject.#frustum.assign(finalMat);
            const mesh     = gameObject.renderer.mesh;
            const collider = mesh.collider;

            // 절두체 컬링. 
            if(gameObject.useFrustumCulling && collider!=null && collider.checkBoundFrustum(frustum)==MyMath.Bound.Outside) {
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

            if(plane.isOutside(p)) {
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
    static #temp0   = Matrix4x4.identity; // Matrix4x4
    static #frustum = new Frustum();      // Frustum

    #bindPose      = Matrix4x4.identity; // Matrix4x4. 본의 바인딩 포즈(root pose).
    #invBindPose   = Matrix4x4.identity; // Matrix4x4. bindPose^(-1).
    #bindPoseDirty = true;               // 본의 바인딩 포즈가 수정되었는지 여부.

    #transform = null; // 본의 트랜스폼.
    #isDirty   = true; // 본의 트랜스폼이 수정되었는지 여부.
    
    #skeletalCache = Matrix4x4.identity; // skeletal() 에서 캐싱된 행렬
    #drawBoneCache = Matrix4x4.identity; // drawBone() 에서 캐싱된 행렬
    
    #parent = null; // 자신의 부모 본
    #childs = [];   // 자신의 자식들의 목록

    boneColor = new Color(0.8, 0.8, 0.8, 1); // 본의 색깔을 지정

    // 루트 본을 생성합니다. 
    constructor(position=Vector3.zero, scale=Vector3.one, rotation=new Quaternion() ) {
        Transform.TRSNonAlloc(this.#bindPose, position, scale, rotation);
        Transform.invTRSNonAlloc(this.#invBindPose, position, scale, rotation);

        this.#transform = new Transform(position, scale, rotation);

        // 본을 표시하기 위한, 메시를 생성합니다. 최초 한번만 생성합니다.
        if(Bone.renderer==null) {
            const renderer = Bone.renderer          = new Renderer();
            const mesh     = Bone.renderer.mesh     = new Mesh();
            const mat      = Bone.renderer.material = new Material();

            mesh.vertices = [
                new Vector3(0,0,0),           // 0
                new Vector3(0.2, 0.2, -0.2),  // 1
                new Vector3(0.2, 0.2, 0.2),   // 2
                new Vector3(-0.2, 0.2, 0.2),  // 3
                new Vector3(-0.2, 0.2, -0.2), // 4
                new Vector3(0,1,0)            // 5
            ];
            mesh.uvs = [Vector2.zero];
            mesh.indices = [
                0,4,1, 0,0,0,
                3,4,0, 0,0,0,
                2,3,0, 0,0,0,
                1,2,0, 0,0,0,
                4,5,1, 0,0,0,
                3,5,4, 0,0,0,
                2,5,3, 0,0,0,
                1,5,2, 0,0,0,
            ];
            mesh.collider  = new BoxCollider(mesh);
            renderer.zTest = false;
        }
    }

    // 본의 스켈레탈 애니메이션을 적용하는 행렬을 돌려줍니다. 스켈레탈 애니메이션을 적용하기 위해,
    // bindPose^(-1) 을 적용하여 로컬 공간(bone space)으로 이동시킵니다. 이후, parent.worldTRS * this.localTRS
    // 을 적용하는 순서를 가집니다. skeletal() 함수는 한번 생성한 결과를 캐싱하며, 트랜스폼이 변경되었을 경우
    // 재생성합니다.
    skeletal() {
        
        if(this.#isDirty) {
            this.#isDirty  = false;
            const worldTRS = this.#transform.modelNonAlloc(Bone.#temp0);

            this.#invBindPose.mulMatNonAlloc(this.#skeletalCache, worldTRS);
        }
        return this.#skeletalCache;
    }


    // 본을 그립니다. 화살표는 부모로부터 자신을 가리키도록 그려집니다. 또한,
    // 그려진 본은 최초 바인딩 포즈로만 그려집니다.
    drawBone(finalMat) {
        const parent = this.#parent;

        if(parent != null) {

            if(this.#bindPoseDirty) {
                const pose0 = this.bindPose;
                const pose1 = parent.bindPose;

                const diff   = pose0.basisW.sub(pose1.basisW).toVector3(); // basisW 는 translation 에 해당.
                const length = diff.magnitude;
                const lookAt = diff.normalized;
                const up     = Vector3.up;
                let   axis   = Vector3.cross(up, lookAt); // |axis| = |up||lookAt||sin| 이므로, 0 <= |axis| <= 1. 혹시 모르니 정규화가 필요.

                if(axis.sqrMagnitude == 0) { // axis = (0,0,0) 라면, up과 평행한 벡터이므로 
                    axis = up;               // 회전축은 그대로 up 으로 해준다.
                }

                const S = new Matrix4x4(
                    new Vector4(1, 0, 0, 0),
                    new Vector4(0, length, 0, 0),
                    new Vector4(0, 0, 1, 0),
                    new Vector4(0, 0, 0, 1)
                );
                const R = Quaternion.rotationMatrix(axis.normalized, Vector3.angle(lookAt,up) );
                const T = new Matrix4x4(
                    new Vector4(1, 0, 0, 0),
                    new Vector4(0, 1, 0, 0),
                    new Vector4(0, 0, 1, 0),
                    diff.mul(-1).toVector4()
                );
                const T2 = new Matrix4x4(
                    new Vector4(1,0,0,0),
                    new Vector4(0,1,0,0),
                    new Vector4(0,0,1,0),
                    pose0.basisW
                ); 

                S.mulMatNonAlloc(this.#drawBoneCache, R, T, T2);

                this.#bindPoseDirty = false;
            }
            finalMat = this.#drawBoneCache.mulMatNonAlloc(Bone.#temp0, finalMat);

            const frustum = Bone.#frustum.assign(finalMat);

            if(Bone.renderer.mesh.collider.checkBoundFrustum(frustum) == Bound.Outside) {
                return;
            }
            Bone.renderer.material.fragmentShader = (uv,pos)=>{ return this.boneColor;}
            Bone.renderer.drawMesh(finalMat);
        }
    }


    // 자식을 추가합니다.
    addChild(bone) {
        const index = this.#childs.indexOf(bone);

        if(index < 0) {
            this.#childs.push(bone);
            this.#transform.addChild(bone.#transform);
            bone.#parent = this;
        }
    }


    // 자식을 제거합니다.
    removeChild(bone) {
        const index = this.#childs.indexOf(bone);

        if(index > -1) {
            this.#childs.splice(index,1);
            this.#transform.removeChild(bone.#transform);
            bone.#parent = null;
        }
    }


    // 본의 트랜스폼이 수정되었음을 모든 자식들에게 알립니다.
    // 모든 자식 본들 또한 isDirty = true; 가 됩니다.
    #setDirty() {
        if(this.#isDirty == false) {
            this.#isDirty = true;

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

    // 본의 공간(bone space)에서 회전량을 수정하거나 얻습니다.
    get localRotation() { return this.#transform.localRotation; }
    set localRotation(newRotation) {
        this.#setDirty();
        this.#transform.localRotation = newRotation;
    }

    // 본의 공간(bone space)에서 크기를 수정하거나 얻습니다.
    get localScale() { return this.#transform.localScale; }
    set localScale(newScale) {
        this.#setDirty();
        this.#transform.localScale = newScale;
    }

    // 본의 공간(bone space)에서 위치를 수정하거나 얻습니다.
    get position() { return this.#transform.position; }
    set position(newPosition) {
        this.#setDirty();
        this.#transform.position = newPosition;
    }

    // 월드 공간(world space)에서 회전량을 수정하거나 얻습니다.
    get worldRotation() { return this.#transform.worldRotation; }
    set worldRotation(newRotation) {
        this.#setDirty();
        this.#transform.worldRotation = newRotation;
    }
    
    // 월드 공간(world space)에서 크기를 수정하거나 얻습니다.
    get worldScale() { return this.#transform.worldScale; }
    set worldScale(newScale) {
        this.#setDirty();
        this.#transform.worldScale = newScale;
    }

    // 월드 공간(world space)에서 위치를 수정하거나 얻습니다.
    get worldPosition() { return this.#transform.worldPosition; }
    set worldPosition(newPosition) {
        this.#setDirty();
        this.#transform.worldPosition = newPosition;
    }

    // 바인딩 포즈를 얻거나 수정합니다. 
    get bindPose() { return this.#bindPose.clone(); }
    set bindPose(newBindPose=Matrix4x4.identity) {
        this.#bindPoseDirty = true;
        
        this.#bindPose.assign(newBindPose);
        this.#invBindPose.assign(newBindPose.inverse() );
    }
};

export class AnimationCurve {
    static #temp0    = Vector2.zero;
    static #temp1    = Vector2.zero;
    static #color    = new Color(0,1,0,0.3);
    static #renderer = new Renderer();

    #splines = null;      // 
    #samples = null;      // 
    #xMax    = -Infinity; // 
    #yMax    = -Infinity; // 

    wrapMode = WrapMode.Loop; // 
   

    // p0,p3 을 endpoint 로 사용하고, p1,p2 를 control point 로 사용하는
    // CubicBezierSpline 을 돌려줍니다. tangent0, tangent1 은 각각 접선
    // p0p1, p2p3 의 기울기(slope) 이며, f(x) = ax + b 에서 b 값을 구하기 위해
    // 사용됩니다. weight0, weight1 은 p1.x, p2.x 를 구하기 위해서 사용됩니다.
    static bezier(p0,p3, tangent0, tangent1, weight0, weight1) {
        const xDist    = Math.abs(p0.x - p3.x); // |x0-x3|
        const invXDist = 1 / xDist;             // 1 / |x0-x3|

        const p0x = p0.x, p0y = p0.y;
        const p3x = p3.x, p3y = p3.y;

        const p1x = p0x + xDist*weight0,     p1y = tangent0 * p1x + (p0y - tangent0*p0x);
        const p2x = p0x + xDist*(1-weight1), p2y = tangent1 * p2x + (p3y - tangent1*p3x);

        const ycurve = {                      // x(t) = (1-t)^3·x0 + 3t(1-t)^2·x1 + 3t^2(1-t)·x2 + t^3·x3
            a: (-p0y + 3*p1y - 3*p2y + p3y),  // x(t) = at^3 + bt^2 + ct + d
            b: (3*p0y - 6*p1y + 3*p2y),       //
            c: (-3*p0y + 3*p1y),              // (1-t)^3 = -t^3 + 3t^2 - 3t + 1
            d: p0y                            // (1-t)^2 = t^2 - 2t + 1
        };                                    //
        const xcurve = {                      // a = (-x0 + 3x1 - 3x2 + x3)
            a: (-p0x + 3*p1x - 3*p2x + p3x),  // b = (3x0 - 6x1 + 3x2)
            b: (3*p0x - 6*p1x + 3*p2x),       // c = (-3x0 + 3x1)
            c: (-3*p0x + 3*p1x),              // d = x0
            d: p0x 
        };

        return {
            getX: function(t) {
                t = (t-p0x) * invXDist;
                const tt = t*t, ttt = tt*t;
                return xcurve.a*ttt + xcurve.b*tt + xcurve.c*t + xcurve.d; // at^3 + bt^2 + ct + d
            },
            getY: function(t) {
                t = (t-p0x) * invXDist;
                const tt = t*t, ttt = tt*t;
                return ycurve.a*ttt + ycurve.b*tt + ycurve.c*t + ycurve.d // at^3 + bt^2 + ct + d
            },
            p0   : p0.clone(),            // endpoint 0
            p1   : p3.clone(),            // endpoint 1,
            cp0  : new Vector2(p1x, p1y), // control point 0
            cp1  : new Vector2(p2x, p2y), // control point 1
        };
    }


    // p0,p1 을 endpoint 로 사용하여, 선형보간하는 LinearSpline 을 돌려줍니다.
    static linear(p0,p1) {
        const x0 = p0.x, y0 = p0.y;
        const x1 = p1.x, y1 = p1.y;
                                     
        const a = (y0-y1) / (x0-x1); // y0 = a*x0 + b
        const b = y0 - a*x0;         // y1 = a*x1 + b
                                     // (y0-y1) = a * (x0-x1)
                                     // (y0-y1) / (x0-x1) = a
        return {
            getX: function(t) { return t; },
            getY: function(t) { return a*t + b; }, // a*t + b
            p0: p0.clone(),
            p1: p1.clone()
        };
    }


    // p0,p1 을 endpoint 로 사용하여, 다음 키까지 키의 값이 변하지 않는 ConstantSpline 을 돌려줍니다.
    static constant(p0,p1) {
        const y = p0.y;

        return {
            getX: function(t) { return t; },
            getY: function(t) { return y; },
            p0: p0.clone(),
            p1: p1.clone()
        };
    }


    // FBX 파일의 AnimationCurve 노드의
    static fromFBXAnimCurve(keyTime, keyValue, keyAttrFlags, keyAttrData, keyAttrRefCount) {
        const length  = keyTime.length;
        const splines = [];
        
        let refCount  = keyAttrRefCount[0];
        let dataIndex = 0;

        keyTime.push(keyTime[length-1]+1);
        keyValue.push(keyValue[0]);

        for(let i=0; i<length; ++i) {
            const p0         = new Vector2(keyTime[i] * ktime2sec, keyValue[i]);
            const p1         = new Vector2(keyTime[i+1] * ktime2sec, keyValue[i+1]);
            const flag       = keyAttrFlags[dataIndex];
            const startIndex = 4*dataIndex;

            if(refCount-- == 0) {
                refCount = keyAttrRefCount[++dataIndex];
            }

            if(flag & InterpolationType.Constant) {
                splines.push(AnimationCurve.constant(p0,p1) );
            }
            else if(flag & InterpolationType.Linear) {
                splines.push(AnimationCurve.linear(p0,p1) );
            }
            else if(flag & InterpolationType.Cubic) {
                let rightSlope     = 0;
                let nextLeftSlope  = 0;
                let rightWeight    = 0.333;
                let nextLeftWeight = 0.333;

                if(flag & TangentMode.TCB) {
                    const tension    = keyAttrData[startIndex + KeyDataIndex.TCBTension];
                    const continuity = keyAttrData[startIndex + KeyDataIndex.TCBContinuity];
                    const bias       = keyAttrData[startIndex + KeyDataIndex.TCBBias];
                }
                
                if(flag & TangentMode.AutoUserBreak) {
                    rightSlope    = keyAttrData[startIndex + KeyDataIndex.RightSlope];
                    nextLeftSlope = keyAttrData[startIndex + KeyDataIndex.NextLeftSlope];
                }
                
                if(flag & WeightedMode.Right)    rightWeight    = keyAttrData[startIndex + KeyDataIndex.RightWeight];
                if(flag & WeightedMode.NextLeft) nextLeftWeight = keyAttrData[startIndex + KeyDataIndex.NextLeftWeight];

                splines.push(AnimationCurve.bezier(p0,p1,rightSlope,nextLeftSlope,rightWeight,nextLeftWeight) );
            }
        }
        return new AnimationCurve(splines);
    }


    // 인자로 받은 spline 들의 배열로 곡선(Curve)을 하나 정의합니다.
    constructor(splines) { this.#splines = splines; }


    // 그래프를 그리는데 사용할 샘플(sample, Vector2)들을 구합니다.
    #getSamples() {
        this.#samples = [];

        for(let i=0; i<this.#splines.length; ++i) {
            const spline = this.#splines[i];
            const p0     = spline.p0;
            const p1     = spline.p1;
            const step   = Math.abs(p0.x-p1.x) * 0.01; // spline 하나 당 100 개의 샘플을 추출한다.

            for(let t=p0.x; t<=p1.x; t+=step) {
                const x = spline.getX(t);
                const y = spline.getY(t);

                const absX = Math.abs(x);
                const absY = Math.abs(y);

                if(absX > this.#xMax) this.#xMax = absX;
                if(absY > this.#yMax) this.#yMax = absY;

                this.#samples.push(new Vector2(x,y) );
            }
        }

        if(MyMath.equalApprox(this.#xMax, 0)) this.#xMax = Math.EPSLION;
        if(MyMath.equalApprox(this.#yMax, 0)) this.#yMax = Math.EPSLION;
    }


    // t 초 일때의 y 값을 돌려줍니다. t 의 값은 [0..xMax] 이며, 범위를 벗어날 경우
    // wrapMode 에 따라
    evaluate(t) {
        t %= this.xMax;

        const spline = this.#splines.find((spline)=>t <= spline.p1.x);
        return spline.getY(t);
    }


    // 
    drawGizmo2D() {
        const renderer   = AnimationCurve.#renderer;
        const tileSizeX  = Camera.tileSizeX;
        const tileSizeY  = Camera.tileSizeY;
        const screenSize = renderer.camera.screenSize; 

        Camera.tileSizeX = screenSize.x * 0.48;
        Camera.tileSizeY = screenSize.y * 0.48;

        renderer.drawGizmo2D();

        Camera.tileSizeX = tileSizeX; // restore tileSizeX
        Camera.tileSizeY = tileSizeY; // restore tileSizeY
    }


    // 곡선을 그립니다. 항상 [0,1] 사이로 정규화되어 그려집니다.
    drawCurve(color=Color.red, loop=0) {
        const renderer   = AnimationCurve.#renderer;
        const tileSizeX  = Camera.tileSizeX;
        const tileSizeY  = Camera.tileSizeY;
        const screenSize = renderer.camera.screenSize; 
        const radius     = 0.005;

        Camera.tileSizeX = screenSize.x * 0.48;
        Camera.tileSizeY = screenSize.y * 0.48;

        // 각 spline 들의 샘플을 구해서, 캐싱한다.
        if(this.#samples == null) {
            this.#getSamples();
        }

        const xMax  = 1 / (this.#xMax * ++loop);
        const yMax  = 1 / (this.#yMax);
        let   xStep = 0;
        
        
        // 곡선을 그린다. 곡선의 x, y 값은 항상 [0,1] 범위의 값으로
        // 정규화된다.
        for(let i=0; i<loop; ++i, xStep += this.#xMax) {

            // 현재 spline 이 bezier 일 경우, control point 도 표시한다.
            for(let i=0; i<this.#splines.length; ++i) {

                if(this.#splines[i].cp0 != undefined) {
                    const cp0 = AnimationCurve.#temp0.assignVector(this.#splines[i].cp0);
                    const cp1 = AnimationCurve.#temp1.assignVector(this.#splines[i].cp1);

                    cp0.x = (cp0.x + xStep) * xMax; cp0.y *= yMax;
                    cp1.x = (cp1.x + xStep) * xMax; cp1.y *= yMax;

                    renderer.drawLine2D(cp0, cp1, AnimationCurve.#color);
                }
            }

            // 캐싱된 샘플들을 그려준다.
            for(let i=0; i<this.#samples.length-1; ++i) {
                const from = AnimationCurve.#temp0.assignVector(this.#samples[i]);
                const to   = AnimationCurve.#temp1.assignVector(this.#samples[i+1]);

                from.x = (from.x + xStep) * xMax; from.y *= yMax;
                to.x   = (to.x + xStep) * xMax;   to.y   *= yMax;
    
                renderer.drawLine2D(from,to,color);
            }


            // 키프레임들을 그려준다.
            for(let i=0; i<this.#splines.length; ++i) {
                const p0 = AnimationCurve.#temp0.assignVector(this.#splines[i].p0);
                const p1 = AnimationCurve.#temp1.assignVector(this.#splines[i].p1);

                p0.x = (p0.x + xStep) * xMax; p0.y *= yMax;
                p1.x = (p1.x + xStep) * xMax; p1.y *= yMax;

                renderer.drawArc2D(p0, radius);
                renderer.drawArc2D(p1, radius);
            }
        }

        Camera.tileSizeX = tileSizeX; // restore tileSizeX
        Camera.tileSizeY = tileSizeY; // restore tileSizeY
    }

    // drawCurve() 함수로 그린 곡선 위에 점을 찍습니다.
    // 찍은 점은 (t, evaluate(t) ) 의 점입니다.
    drawPoint(t, color=Color.blue, loop=0) {
        const renderer   = AnimationCurve.#renderer;
        const tileSizeX  = Camera.tileSizeX;
        const tileSizeY  = Camera.tileSizeY;
        const screenSize = renderer.camera.screenSize; 
        const radius     = 0.005;

        Camera.tileSizeX = screenSize.x * 0.48;
        Camera.tileSizeY = screenSize.y * 0.48;

        // 각 spline 들의 샘플을 구해서, 캐싱한다.
        if(this.#samples == null) {
            this.#getSamples();
        }

        t %= this.xMax * ++loop;

        const xMax  = (this.#xMax * loop);
        const yMax  = (this.#yMax);

        const p = new Vector2(
            t / xMax, 
            this.evaluate(t) / yMax 
        );
        renderer.drawArc2D(p, radius, color);

        Camera.tileSizeX = tileSizeX; // restore tileSizeX
        Camera.tileSizeY = tileSizeY; // restore tileSizeY
    }


    // 그래프의 x 값의 최댓값 |x| 을 얻습니다. 결과는 항상 절댓값입니다. 
    get xMax() {
        if(this.#samples == null) {
            this.#getSamples();
        }
        return this.#xMax;
    }

    // 그래프의 y 값의 최댓값 |y| 을 얻습니다. 결과는 항상 절댓값입니다.
    get yMax() {

        if(this.#samples == null) {
            this.#getSamples();
        }
        return this.#yMax;
    }
};


export class AnimationState {
    props = {};
    name  = "";


    // 두 AnimationState 를 보간합니다. 
    static lerp(stateStart, stateEnd, t) {
        
    }

    constructor(stateName) {
        this.name = stateName; 
    }


    // 애니메이션을 적용할 속성(property)을 하나 추가합니다.
    // type   : PropertyType 으로 속성의 타입을 지정하고, 정해진 갯수의 인자를 줘야 합니다.
    //
    // setter : 실제 property 에 값을 세팅하는 함수입니다. type 에 맞는 인자를 하나 받고, 세팅한 결과를 반환해야 합니다.
    //          setter 의 반환값(return value)은 애니메이션을 보간하는데 사용되며, setter 의 참조로 같은 property 인지를 구분함에 유의해야 합니다.
    //
    // curves : AnimationCurve 입니다. type 에 따라 주어야할 갯수가 달라집니다.
    addProperty(type, setter, ...curves) {
        this.props[setter] = {
            setter : setter,
            type   : type,
            curves : curves
        };
        return setter;
    }


    // 시간 t 에 따라 속성(property)들의 값을 갱신합니다.
    update(t) {

        for(const key in this.props) {
            const prop = this.props[key];

            switch(prop.type) {

                case PropertyType.Quaternion: {
                    const x = prop.curves[0].evaluate(t);
                    const y = prop.curves[1].evaluate(t);
                    const z = prop.curves[2].evaluate(t);

                    prop.setter(Quaternion.euler(new Vector3(x,y,z)) );
                    break;
                }
                case PropertyType.Vector2: {
                    const x = prop.curves[0].evaluate(t);
                    const y = prop.curves[1].evaluate(t);
                    
                    prop.setter(new Vector2(x,y));
                    break;
                }
                case PropertyType.Vector3: {
                    const x = prop.curves[0].evaluate(t);
                    const y = prop.curves[1].evaluate(t);
                    const z = prop.curves[2].evaluate(t);

                    prop.setter(new Vector3(x,y,z));
                    break;
                }
                case PropertyType.Vector4: {
                    const x = prop.curves[0].evaluate(t);
                    const y = prop.curves[1].evaluate(t);
                    const z = prop.curves[2].evaluate(t);
                    const w = prop.curves[3].evaluate(t);

                    prop.setter(new Vector4(x,y,z,w));
                    break;
                }
                case PropertyType.Number: {
                    const num = prop.curves[0].evaluate(t);

                    prop.setter(num);
                    break;
                }
            }
        }
    }
};


export class Animator {
    
};
