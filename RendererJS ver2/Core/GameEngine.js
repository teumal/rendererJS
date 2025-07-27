
import {Vector2, Vector3, Vector4, Quaternion, Matrix4x4} from "./MyMath.js";
import {Renderer} from "./Renderer.js";
import {Camera} from "./Camera.js";
import { Transform } from "./Transform.js";
import { Shader } from "./Shader.js";


/** GameEngine 은 렌더러를 사용할 최소한의 환경을 만들어줍니다. */
export class GameEngine {
    static #cvs;
    static #ctx;

    static #prevTimestamp;
    static #timestamp;
    static #frameNumber;

    static #textQueue;
    static #inputState;
    static #imageData;


    ///////////////////////////
    // Private Methods       //
    ///////////////////////////


    /**  */
    static #playerLoop(t) {
        Renderer.camera = Camera.main;

        // 1) deltaTime 갱신
        GameEngine.#prevTimestamp = GameEngine.#timestamp;
        GameEngine.#timestamp     = t;
        GameEngine.#frameNumber  += 1;


        // 2) Game logic
        GameEngine.#updateGameLogic();


        // 3) Scene Rendering
        GameEngine.#renderScene();

        
        // 4) imageData 를 canvas 에 제출한 후, 깊이/후면 버퍼를 초기화한다.
        GameEngine.#submitImageData(); 


        // 5) GUI Rendering
        GameEngine.#renderGUI();
        

        // 6) 입력 정보 갱신
        GameEngine.#updateInput();     


        window.requestAnimationFrame(GameEngine.#playerLoop);
    }


    /** Game logic 을 갱신합니다. */
    static #updateGameLogic() {
        const count     = GameObject.instanceCount;
        const deltaTime = GameEngine.deltaTime;

        for(let i=0; i<count; ++i) {
            const gameObject = GameObject.findObjectByIndex(i);

            if(gameObject.update != undefined) { // update 함수가 정의되어 있는 경우에만
                gameObject.update();             // GameObject.update() 를 호출한다.
            }
            if(gameObject.animator) {                  // Animator 가 있다면, 애니메이션 갱신을 위해
                gameObject.animator.update(deltaTime); // Animator.update() 를 호출한다.
            }
        }
    }


    /** Scene 을 렌더링합니다. */
    static #renderScene() {
        const cameraCount     = Camera.cameraCount;
        const gameObjectCount = GameObject.instanceCount;

        for(let i=0; i<cameraCount; ++i) {
            const camera = Renderer.camera = Camera.findCameraByIndex(i);

            const V  = camera.view(Shader.VIEW_MATRIX);               // V  = view matrix
            const P  = camera.perspective(Shader.PERSPECTIVE_MATRIX); // P  = perspective matrix
            const PV = V.mulMat(P, Shader.VIEW_PERSPECTIVE_MATRIX);   // PV = P·V

            for(let j=0; j<gameObjectCount; ++j) {
                const gameObject = GameObject.findObjectByIndex(j);
                const renderer   = gameObject.renderer;

                const M = Shader.MODEL_MATRIX = gameObject.model(); // M   = Modeling Matrix
                M.mulMat(PV, Shader.FINAL_MATRIX);                  // PVM = (P·V)·M

                renderer.renderMesh(); // renderer.mesh 를 렌더링한다.
            }

            Renderer.clearDepthBuffer();
        }
    }


    /** imageData 를 canvas 에 제출한 후, 후면 버퍼를 초기화한다. */
    static #submitImageData() {
        const imageData = GameEngine.#imageData;

        GameEngine.#ctx.putImageData(imageData, 0, 0);
        imageData.data.fill(0,0);
    }


    /** GUI 를 렌더링합니다. */
    static #renderGUI() {
        const ctx       = GameEngine.#ctx;
        const textQueue = GameEngine.#textQueue;

        ctx.fillStyle = 'black';

        for(let i=0; i<textQueue.length; ++i) {
            const text = textQueue[i];
            ctx.fillText(text.text, text.pos.x, text.pos.y);
        }
        textQueue.length = 0;
    }


    /** 입력 정보를 갱신합니다. 입력은 항상 프레임 기반(frame-based)으로 진행됩니다. */
    static #updateInput() {
        const inputState = GameEngine.#inputState;

        for(const key in inputState) {
            const state = inputState[key];

            if(state.cur == KeyState.Down) { // 현재 Down 이었다면
                state.cur = KeyState.Press;  // 다음 프레임부터는 Press 가 관찰된다.
            }
            else if(state.cur == KeyState.Up) { // 현재 Up 이었다면
                state.cur = KeyState.None;      // 다음 프레임부터는 None 이 관찰된다.
            }
            
            if(state.next != KeyState.None) { // next 에 버퍼링되어있는 입력 상태(Down/Up)가 있다면
                state.cur   = state.next;     // 다음 프레임부터는 next 가 관찰되도록
                state.next  = state.next2;    // cur-next-next2 를 앞으로 한칸씩 옮긴다(shift).
                state.next2 = KeyState.None;
            }
        }
    }


    /////////////////////////////
    // Public Methods          //
    /////////////////////////////


    /** GameEngine 을 초기화합니다.  */
    static initialize(canvas=new HTMLCanvasElement(), resolution=new Vector2(800, 450)) {

        if(GameEngine.#cvs != undefined) { // 이미 GameEngine 이 초기화된 적이 있다면
            return;                        // initialize 호출을 무시한다.
        }
        GameEngine.#cvs = canvas;
        GameEngine.#ctx = canvas.getContext('2d');
        GameEngine.setResolution(resolution.x, resolution.y); // 캔버스의 해상도를 설정한다.

        window.addEventListener("keydown", (e)=>{
            const inputState = GameEngine.#inputState;
            let   state      = inputState[e.key];

            if(state == undefined) {
                state = inputState[e.key] = { cur:0, next:0, next2:0 }; 
            }

            if(state.cur == KeyState.None) {
                state.cur = KeyState.Down;
            }
            else if(state.next == KeyState.None) {

                if((state.cur & KeyState.DownPress) == 0) {
                    state.next = KeyState.Down;
                }
            }
            else if(state.next2 == KeyState.None) {

                if((state.cur & KeyState.DownPress) == 0) {
                    state.next = KeyState.Down;
                }
            }
            else if(state.cur == KeyState.Up) {
                state.next2 = KeyState.None;
            }
        });
        window.addEventListener("keyup", (e)=>{
            const inputState = GameEngine.#inputState;
            let   state      = inputState[e.key];

            if(state == undefined) {
                state = inputState[e.key] = { cur:0, next:0, next2:0 };
            }

            if(state.cur == KeyState.None) {
                state.cur = KeyState.Up;
            }
            else if(state.next == KeyState.None) {
                state.next = KeyState.Up;
            }
            else if(state.next2 == KeyState.None) {
                state.next2 = KeyState.Up;
            }
            else if(state.cur == KeyState.Down) {
                state.next2 = KeyState.None;
            }
        });
        if(Camera.cameraCount == 0) {                                       // 카메라가 한 개도 없다면
            Renderer.camera = new Camera(0,0, canvas.width, canvas.height); // 메인 카메라를 생성한다.
        }
        GameEngine.#textQueue   = [];
        GameEngine.#inputState  = [];
        GameEngine.#timestamp   = 0;
        GameEngine.#frameNumber = 0;

        window.requestAnimationFrame(GameEngine.#playerLoop);
    }


    /** 캔버스의 해상도를 설정합니다. */
    static setResolution(width, height) {
        const arrayBuffer = new ArrayBuffer(width * 4 * height);

        GameEngine.#cvs.width  = Renderer.cvsWidth = width;
        GameEngine.#cvs.height = height;
        GameEngine.#imageData  = new ImageData(new Uint8ClampedArray(arrayBuffer), width);
        
        Renderer.setPixelBuffer(new Uint32Array(arrayBuffer), width, height);
    }


    /** 캔버스의 해상도를 나타내는 Vector2 (width, height) 를 얻습니다. */
    static getResolution() { 
        const cvs = GameEngine.#cvs;
        return new Vector2(cvs.width, cvs.height); 
    }


    /** keycode 로 명시한 키를 눌렀다면 true 를 돌려줍니다. */
    static getKeyDown(keycode) {
        const result = GameEngine.#inputState[keycode];

        if(result == undefined) {
            return false;
        }
        if(result.cur == KeyState.Down) {
            return true;
        }
        return false;
    }


    /** keycode 로 명시한 키를 누르고 있는 동안 true 를 돌려줍니다. */
    static getKey(keycode) {
        const result = GameEngine.#inputState[keycode];

        if(result == undefined) {
            return false;
        }
        if(result.cur & KeyState.DownPress) {
            return true;
        }
        return false;
    }


    /** keycode 로 명시한 키를 뗐다면, true 를 돌려줍니다. */
    static getKeyUp(keycode) {
        const result = GameEngine.#inputState[keycode];

        if(result == undefined) {
            return false;
        }
        if(result.cur == KeyState.Up) {
            return true;
        }
        return false;
    }


    /** screenPos 위치에 string 을 표시합니다. */
    static drawText(text, screenPos) { 
        GameEngine.#textQueue.push({ 
            text : text, 
            pos  : screenPos
        }); 
    }


    /** 이전 프레임에서 현재 프레임 사이의 간격(in seconds)을 돌려줍니다. 결과는 number 입니다. */
    static get deltaTime() { return (GameEngine.#timestamp - GameEngine.#prevTimestamp) * 0.001; }


    /** 현재 프레임의 번호를 나타내는 number 를 얻습니다. */
    static get frameNumber() { return GameEngine.#frameNumber; }


    /** GameEngine 이 초기화되었는지 여부를 나타내는 boolean 을 얻습니다. */
    static get initialized() { return GameEngine.#cvs != undefined; }
};


/** GameObject */
export class GameObject {
    static #gameObjects = [];

    #renderer  = new Renderer();
    #transform = new Transform();


    /** GameObject 에 부착되어 있는 Animator. */
    animator = null;


    ///////////////////////
    // Static Methods    //
    ///////////////////////


    /**  */
    static findObjectByIndex(index) { return GameObject.#gameObjects[index]; }


    /** 생성된 GameObject 들의 갯수를 얻습니다. 결과는 Number 입니다.  */
    static get instanceCount() { return GameObject.#gameObjects.length; }


    ///////////////////////
    // Public Methods    //
    ///////////////////////


    /** GameObject 를 생성합니다. 생성한 GameObject 는 GameEngine 에 의해 자동 관리됩니다. */
    constructor(name) { 
        this.name = name ? name : `GameObject ${GameObject.instanceCount}`;;
        GameObject.#gameObjects.push(this); 
    }


    /** 모델링 행렬(modeling matrix)을 나타내는 Matrix4x4 를 돌려줍니다. 결과는 읽기 전용(read-only)입니다. 
     * 
     *  복사본이 필요하다면 model().clone() 처럼 사용해야 합니다. */
    model() { return this.#transform.TRS(); }


    /** update 는 매 프레임 마다 호출됩니다. */
    update;


    /** GameObject 의 이름을 나타내는 string. */
    get name() { return this.#transform.name; }
    set name(name) { this.#transform.name = name; }


    /** GameObject 에 부착되어 있는 Transform. */
    get transform() { return this.#transform; }


    /** GameObject 에 부착되어 있는 Renderer. */
    get renderer() { return this.#renderer; }
};



/**  */
export const KeyCode = {
    Left    : "ArrowLeft",
    Right   : "ArrowRight",
    Up      : "ArrowUp",
    Down    : "ArrowDown",
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
    A       : "a",
    B       : "b",
    C       : "c",
    D       : "d",
    E       : "e",
    F       : "f",
    G       : "g",
    H       : "h",
    I       : "i",
    J       : "j",
    K       : "k",
    L       : "l",
    M       : "m",
    O       : "o",
    P       : "p",
    Q       : "q",
    R       : "r",
    S       : "s",
    T       : "t",
    U       : "u",
    V       : "v",
    W       : "w",
    X       : "x",
    Y       : "y",
    Z       : "z",
    Space   : " ",
    Enter   : "Enter",
    Escape  : "Escape",
    Shift   : "Shift",
    Tab     : "Tab",
    Control : "Control",
    F1      : "F1",
    F2      : "F2",
    F3      : "F3",
    F4      : "F4",
    F5      : "F5",
    F6      : "F6",
    F7      : "F7",
    F8      : "F8",
    F9      : "F9",
    F10     : "F10",
    F11     : "F11",
    F12     : "F12"
};


/** GameEngine 에서 입력 감지를 위해 내부적으로 사용되는 열거형입니다. */
const KeyState = {
    None      : 0,
    Down      : 1,
    Press     : 2,
    Up        : 3,
    DownPress : 3
};
