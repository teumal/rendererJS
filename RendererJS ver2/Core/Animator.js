
import { Vector2, Vector3, Vector4, Matrix4x4, Quaternion, MyMath, RotationOrder } from "./MyMath.js";
import { Color } from "./Shader.js";
import { Camera } from "./Camera.js";
import { Renderer } from "./Renderer.js";


/**  */
export const ExtrapolationMode = {
    Const            : 0,
    Repetition       : 1,
    MirrorRepetition : 2,
    KeepSlope        : 3
};

/**  */
export const PropertyType = {
    LocalScale    : 0, // Transform.localScale
    LocalRotation : 1, // Transform.localRotation
    LocalPosition : 2, // Transform.localPosition
};



/** Animator 는 애니메이션을 재생하고 관리합니다. */
export class Animator {
    #states = new Map();

    #prevState; #prevTime;
    #curState;  #curTime;
    

    /** 애니메이션의 속도를 나타내는 number. */
    speed = 1;


    ///////////////////////////
    // Instance methods      //
    ///////////////////////////


    /**  */
    constructor() {
        this.#curState  = null;
        this.#prevState = null;

        this.#prevTime = 0;
        this.#curTime  = 0;
    }


    /** AnimationState 를 추가합니다. 같은 이름의 AnimationState 가 이미 존재한다면, animState 로 대체합니다. */
    addState(animState) { this.#states.set(animState.name, animState); }


    /** stateName 을 이름으로 하는 AnimationState 를 삭제합니다. */
    removeState(stateName) { this.#states.delete(stateName); }


    /**  */
    play(stateName, normalizedTime=0, speed=1) {
        
    }

    /**  */
    update(deltaTime) {

    }
};


/** 하나의 애니메이션을 정의합니다. */
export class AnimationState {
    static #temp0 = new Vector3();
    static #temp1 = new Vector3();
    static #temp2 = new Quaternion();

    #objects = new Map();


    /** 애니메이션의 이름을 나타내는 string. */
    name;


    /** 애니메이션의 총 시간(초)를 나타내는 number. */
    duration;


    /** 애니메이션을 모두 재생한 이후의 동작을 명시하는 ExtrapolationMode. 
     * 
     *  기본값은 ExtrapolationMode.Repetition 이며, 애니메이션을 무한히 반복함을 의미합니다.
     */
    extrapolationMode = ExtrapolationMode.Repetition;


    /////////////////////////////
    // Instance methods        //
    /////////////////////////////
    

    /** stateName 을 애니메이션 이름으로 하고, duration 을 애니메이션의 재생 시간으로 하는 AnimationState 를 생성합니다. */
    constructor(stateName="", duration=0) {
        this.name     = stateName;
        this.duration = duration;
    }

    /** AnimatedProperty 를 추가합니다. */
    addProperty(object, prop) {

        if(!this.#objects.has(object)) {   // object 가 Map 에 등록되어 있지 않다면,
            this.#objects.set(object, []); // object 를 key 로 하는 배열 [] 을 추가한다.
        }
        const props = this.#objects.get(object);
        const index = props.findIndex(p => p.type == prop.type);

        if(index == -1) {     // 같은 PropertyType 을 가진 AnimatedProperty 가 없다면, 
            props.push(prop); // prop 을 추가한다.
        }
        else {                   // 이미 같은 PropertyType 을 가진 AnimatedProperty 가 있다면
            props[index] = prop; // prop 으로 대체한다.
        }
    }

    /** object 를 this 객체로 사용하고, PropertyType 이 type 인 AnimatedProperty 를 제거합니다. */
    removeProperty(object, type) {

        if(this.#objects.has(object)) {
            const props = this.#objects.get(object);
            const index = props.findIndex(p => p.type == type);

            if(index != -1) {
                props.splice(index, 1);
            }
        }
    }


    /** object 를 this 객체로 사용하고, PropertyType 이 type 인 AnimatedProperty 를 찾아 돌려줍니다.
     * 
     *  조건에 부합하는 AnimatedProperty 가 없다면 결과는 undefined 입니다.
     */
    findProperty(object, type) {

        if(this.#objects.has(object)) {
            const props = this.#objects.get(object);
            return props.find(p => p.type == type);
        }
    }


    /** 캐릭터가 t초 일때의 자세(pose)가 되도록, AnimatedProperty 들의 값을 갱신합니다.  */
    evalulate(t) {
        const temp0 = AnimationState.#temp0;
        const temp1 = AnimationState.#temp1;
        const temp2 = AnimationState.#temp2;

        for(const keyvalue of this.#objects) {
            const object = keyvalue[0];
            const props  = keyvalue[1];

            for(const prop of props) {
                const value = prop.getValue(t, this.extrapolationMode);
                prop.setValue(object, value);
            }
        }
    }
};


/** 애니메이션을 적용할 속성을 정의합니다. */
export class AnimatedProperty {

    /**  */
    type;
    
    /**  */
    resetValue;

    /**  */
    layerName;

    /**  */
    xcurve; ycurve; zcurve;


    /////////////////////////////
    // Instance methods        //
    /////////////////////////////


    /**  */
    getValue(t, extrapolationMode, out) {
        const x = this.xcurve.evaluate(t, extrapolationMode);
        const y = this.ycurve.evaluate(t, extrapolationMode);
        const z = this.zcurve.evaluate(t, extrapolationMode);

        if(out == undefined) {
            out = (this.type == PropertyType.LocalRotation) ? new Quaternion() : new Vector3();
        }

        return this.calculateValue(x,y,z, out);
    }

    /** */
    setValue(object, value) {

        switch(this.type) {
            case PropertyType.LocalScale    : { object.localScale = value; break; }
            case PropertyType.LocalRotation : { object.localRotation = value; break; }
            case PropertyType.LocalPosition : { object.localPosition = value; break; }
        };
    }

    /**  */
    calculateValue = (x,y,z, out) => {

        switch(this.type) {
            case PropertyType.LocalScale    : { return out.assign(x,y,z); }
            case PropertyType.LocalRotation : { return Quaternion.euler(x,y,z, RotationOrder.EulerYXZ, out); }
            case PropertyType.LocalPosition : { return out.assign(x,y,z); }
        };
    };

    /**  */
    drawCurve2D() {
        this.xcurve.drawCurve2D(1, Color.red);
        this.ycurve.drawCurve2D(1, Color.green);
        this.zcurve.drawCurve2D(1, Color.blue);
    }
};


/** AnimationCurve 는 애니메이션 곡선을 정의합니다. */
export class AnimationCurve {

    /** 스플라인 곡선을 나타내는 AnimationCurve[]. */
    #spline = [];

    /** 애니메이션 곡선의 총 시간(초)를 나타내는 number */
    #duration = 0;

    /** evaluate() 의 디폴트값. */
    defaultValue;


    //////////////////////////
    // Instance methods     //
    //////////////////////////


    /**  */
    append(...curves) {

        if(curves.length == 0) {
            return;
        }
        for(let curve of curves) {
            this.#spline = this.#spline.concat(curve.#spline);
        }
        const first = this.#spline[0];
        const last  = this.#spline[this.#spline.length-1];

        this.#duration = last.end.x - first.begin.x;
    }


    /** t 초일 때의  */
    evaluate(t=0, extrapolationMode=ExtrapolationMode.Repetition) {

        if(this.#spline.length == 0) { // 
            return this.defaultValue;  // 
        }

        switch(extrapolationMode) {
            case ExtrapolationMode.Const:            { t = MyMath.clamp(t, 0, this.#duration); break; }
            case ExtrapolationMode.Repetition:       { t %= this.#duration; break; }
            case ExtrapolationMode.MirrorRepetition: { t = Math.abs(this.#duration * Math.sin(t/this.#duration * MyMath.PI1_2)); break; }
            case ExtrapolationMode.KeepSlope:        { break; }
        };
        const localStart = this.#spline[0].begin.x;
        t += localStart;

        const curve = this.#spline.find(curve => (t <= curve.end.x));

        if(curve == undefined) {      // 조건에 부합하는 AnimationCurve 가 없다면
            return this.defaultValue; // defaultValue 를 돌려준다.
        }
        return curve.getY(t);
    }


    /** 현재 카메라 평면에  */
    drawCurve2D(normalizedTime=1, color=Color.red, extrapolationMode=ExtrapolationMode.Repetition) {
        const camera = Renderer.camera;
        const min    = camera.min;
        const max    = camera.max;

        const width  = camera.width;
        const height = camera.height;
        const halfh  = height * 0.5;
        const halfw  = width * 0.5;

        const duration = (normalizedTime * this.#duration);
        const step0    = duration / width;
        const step1    = 1/width;

        const points = [];
        let   yMin   = 0;

        const from = Renderer.camera.screenToWorld(new Vector2(min.x, min.y+halfh));
        const to   = Renderer.camera.screenToWorld(new Vector2(max.x, min.y+halfh));
        Renderer.drawLine2D(from, to, Color.black);

        for(let t=0, x=0; t<duration; t+=step0, x+=step1) {
            const y    = this.evaluate(t, extrapolationMode);
            const absY = Math.abs(y);

            points.push(new Vector2(-halfw + x*width, y));

            if(absY > yMin) {
                yMin = absY;
            }
        }
        points.forEach(p => p.y = p.y / yMin * halfh); // p.y 를 [-halfh, halfh] 범위로 정규화시킨다.
        
        for(let i=0; i<points.length-1; ++i) {
            Renderer.drawLine2D(points[i], points[i+1], color);
        }
    }


    /** 애니메이션 곡선의 총 시간(초)를 나타내는 number */
    get duration() { return this.#duration; }


    /** animation curve 의 시작점(begin point)을 나타내는 Vector2 를 돌려줍니다. 항상 복사본을 돌려줍니다. */
    get beginPoint() { return this.#spline[0].begin.clone(); }


    /** animation curve 의 끝점(end point)을 나타내는 Vector2 를 돌려줍니다. 항상 복사본을 돌려줍니다. */
    get endPoint() { return this.#spline[this.#spline.length-1].end.clone(); }



    //////////////////////////
    // Static methods       //
    //////////////////////////


    /** p0, p1 을 시작점과 끝점으로 사용하는 constant progression 을 생성합니다. 결과는 AnimationCurve 입니다.
     * 
     *  p0, p1 은 new Vector2(t, value) 이어야 하며, t 초일때 value 를 돌려줌을 의미합니다. */
    static linear(p0, p1) {
        const beginTime = p0.x;
        const duration  = 1 / Math.abs(p3.x - p0.x);

        const a = (p1.y - p0.y) / (p1.x - p0.y); // f(x) = a·x + b
        const b = p0.y - a*p0.x;                 // 
                                                 // a = (y1-y0) / (x1-x0)
        function getY(t) {                       // b = y0 - a·x0
            t = (t-beginTime) * duration; // t 를 [0,1] 범위로 정규화시킨다.
            return a*t + b;               // a·t + b
        }

        const curve = new AnimationCurve();      

        curve.#spline.push({
            begin : p0.clone(),
            end   : p1.clone(),
            getY  : getY
        });
        return curve;
    }


    /** p0, p1 을 시작점과 끝점으로 사용하는 linear progression 을 생성합니다. 결과는 AnimationCurve 입니다. 
     * 
     *  p0, p1 은 new Vector2(t, value) 이어야 하며, t 초일때 value 를 돌려줌을 의미합니다. */
    static constant(p0,p1) {
        const curve = new AnimationCurve();
        const p0x   = p0.x;

        curve.#spline.push({
            begin : p0.clone(),
            end   : p1.clone(),
            getY  : t => p0x
        });
        return curve; 
    }


    /** p0,p3 을 시작점과 끝점으로 사용하고, p1,p2 를 control point 로 사용하는 cubic bezier progression(3차 베지어 곡선)를 생성합니다. 결과는 AnimationCurve 입니다.
     * 
     *  p0p1slope, p2p3slope 은 각각 접선(tangent) p0p1, p2p3 의 기울기(slope)이며, 접선 벡터의 방향을 구하는데 사용됩니다.
     * 
     *  p0p1weight, p2p3weight 는 접선 벡터 p0p1, p2p3 의 크기를 의미하며, p1, p2 를 구하기 위해 사용됩니다. 
     * 
     *  p0, p1, p2, p3 은 new Vector2(t, value) 이어야 하며, t 초일때 value 를 돌려줌을 의미합니다. */
    static cubicBezier(p0, p3, p0p1slope, p2p3slope, p0p1weight, p2p3weight) {
        const beginTime = p0.x;
        const duration  = 1 / (p3.x - p0.x);

        const p0p1 = new Vector2(1, p0p1slope).normalized;
        const p2p3 = new Vector2(1, p2p3slope).normalized;

        const p1 = Vector2.add(p0, p0p1.mulScalar(p0p1weight)); // p1 = p0 + p0p1weight · p0p1 
        const p2 = Vector2.sub(p3, p2p3.mulScalar(p2p3weight)); // p2 = p3 - p0p1weight · p2p3 
        
        const coeff = {                          // B(t) = (1-t)^3 · p0 + 3t(1-t)^2 · p1 + 3(1-t)t^2 · p2 + t^3 · p3
            a: (-p0.y + 3*p1.y - 3*p2.y + p3.y), // B(t) = (-t^3 + 3t^2 -3t + 1) · p0 + (3t - 6t^2 + 3t^3) · p1 + (3t^2 - 3t^3) · p2 + (t^3) · p3
            b: (3*p0.y - 6*p1.y + 3*p2.y),       // 
            c: (-3*p0.y + 3*p1.y),               // (-t^3·p0 + 3t^3·p1 - 3t^3·p2 + t^3·p3) = (-p0 + 3·p1 - 3·p2 + p3)·t^3
            d: p0.y                              // (3t^2·p0 - 6t^2·p1 + 3t^2·p2)          = (3·p0 - 6·p1 + 3·p2)·t^2
        };                                       // (-3t·p0 + 3t·p1)                       = (-3·p0 + 3·p1)·t
                                                 // 1·p0
        function getY(t) {                       //
            t = (t-beginTime) * duration;        // B(t) = (-p0 + 3·p1 - 3·p2 + p3)·t^3 + (3·p0 - 6·p1 + 3·p2)·t^2 + (-3·p0 + 3·p1)·t + p0
            const tt  = t*t;                     // B(t) = a·t^3 + b·t^2 + c·t + d 
            const ttt = tt*t;
            return (coeff.a*ttt) + (coeff.b*tt) + (coeff.c*t) + coeff.d; // a·t^3 + b·t^2 + c·t + d
        }

        const curve = new AnimationCurve();

        curve.#spline.push({
            begin : p0.clone(),
            end   : p3.clone(),
            getY  : getY
        });
        return curve;
    }
};
