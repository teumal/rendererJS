

/** Quaternion.euler 함수의 회전 순서를 정의하는 열거형입니다. */
export const RotationOrder = {
    EulerXYZ : 0, // R = roll * yaw * pitch
    EulerXZY : 1, // R = yaw * roll * pitch
    EulerYZX : 2, // R = pitch * roll * yaw
    EulerYXZ : 3, // R = roll * pitch * yaw
    EulerZXY : 4, // R = yaw * pitch * roll
    EulerZYX : 5, // R = pitch * yaw * roll
};


/** 게임 수학 관련 함수들과 상수들을 정의합니다. */
export class MyMath {

    /** degree 값에 곱하여 radian 으로 변환하는 상수입니다. */
    static DEG2RAD = Math.PI / 180.0;


    /** Deg2Rad * 0.5 를 나타내는 상수입니다. */
    static DEG2RAD1_2 = MyMath.DEG2RAD * 0.5;


    /** radian 값에 곱하여 degree 로 변환하는 상수입니다. */
    static RAD2DEG = 180.0 / Math.PI;


    /** PI * 0.5 를 나타내는 상수입니다. */
    static PI1_2 = Math.PI * 0.5;


    /** f 가 0에 매우 근접하다면 0 을 돌려주고, 이외의 경우 f 를 돌려줍니다. */
    static zeroOrF(f) {
        
        if(MyMath.equalApprox(f, 0)) {
            return 0.0;
        }
        return f;
    }


    /** f 의 부호를 돌려줍니다. 0 과 같거나 크면 1을, 이외의 경우 -1 을 돌려줍니다. */
    static sign(f) { return (f < 0) ? -1 : 1; }


    /** a 를 [min, max] 범위가 되도록 클램핑해줍니다. */
    static clamp(a, min, max) {

        if(a < min) {
            a = min;
        }
        else if(a > max) {
            a = max;
        }
        return a;
    }


    /**  */
    static lerp(from, to, s) {
        return from * (1-s) + to * s;
    }


    /** a 와 b 가 근사적으로 같은지 확인합니다. */
    static equalApprox(a, b) {
        const min = a - Number.EPSILON;
        const max = a + Number.EPSILON;
        
        if(min <= b && b <= max) {
            return true;
        }
        return false;
    }
};


/** 2차원 벡터를 정의합니다. */
export class Vector2 {
    static #temp = new Vector2();

    x; y;

    ////////////////////////////
    // Static Methods         //
    ////////////////////////////

    /** 두 벡터의 내적(u·v)의 결과를 돌려줍니다. 결과는 number 입니다. */
    static dot(u, v) { return (u.x * v.x) + (u.y * v.y); }


    /** (a + ... + args) 의 결과를 나타내는 Vector2. 항상 복사본을 돌려줍니다. */
    static add(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x += arg.x;
            ret.y += arg.y;
        }
        return ret;
    }


    /** (a - ... - args) 의 결과를 나타내는 Vector2. 항상 복사본을 돌려줍니다. */
    static sub(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x -= arg.x;
            ret.y -= arg.y;
        }
        return ret;
    }


    /** 스칼라 계수 s 를 통해 선형보간을 수행합니다. 결과는 (from·(1-s) + to·s) 를 나타내는 Vector2 이며,
     * 
     *  out 에 담아 돌려줍니다. s 의 범위는 [0, 1] 이지만, 범위를 벗어났는지 여부는 확인하지 않습니다.*/
    static lerp(from, to, s, out=new Vector2()) {
        const s2 = (1- s);

        return out.assign(
            from.x*s2 + to.x*s,
            from.y*s2 + to.y*s
        );
    }

    static get zero() { return new Vector2(); }
    static get one()  { return new Vector2(1,1); }
    static get right() { return new Vector2(1,0); }
    static get left() { return new Vector2(-1,0); }
    static get up() { return new Vector2(0,1); }
    static get down() { return new Vector2(0,-1); }


    ////////////////////////
    // Public Methods     //
    ////////////////////////


    /** (x,y) 를 생성합니다. 결과는 Vector2 입니다. */
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }

    /** Vector2 를 나타내는 string 을 돌려줍니다. */
    toString() { 
        const x = MyMath.zeroOrF(this.x).toFixed(2);
        const y = MyMath.zeroOrF(this.y).toFixed(2);
        return `(${x}, ${y})`;
    }


    /** Vector3 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector3(z=0, out=new Vector3()) { return out.assign(this.x, this.y, z); }


    /** Vector4 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector4(z=0, w=1, out=new Vector4()) { return out.assign(this.x, this.y, z, w); }


    /** 자신의 복사본을 생성합니다. 결과는 Vector2 입니다. */
    clone() { return new Vector2(this.x, this.y); }


    /** this 의 성분들을 (x,y) 로 설정하고, this 를 돌려줍니다. assign(v) 처럼 호출하면
     * 
     *  this 의 성분들을 (v.x, v.y) 로 설정합니다. */
    assign(x,y) {

        if(arguments.length == 1) {
            const v = x;
            this.x = v.x;
            this.y = v.y;
        }
        else {
            this.x = x;
            this.y = y;
        }
        return this;
    }


    /** out = (this + ... + args). 결과는 Vector2 이며 out 을 돌려줍니다. a.add(b,c,a) 처럼 호출하면
     * 
     *  a = (a + b + c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static add() 를 사용하시길 바랍니다. */
    add(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector2.#temp.assign(this);
        
        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x += arg.x;
            temp.y += arg.y;
        }
        return out.assign(temp);
    }


    /** out = (this - ... - args). 결과는 Vector2 이며 out 을 돌려줍니다. a.sub(b,c,a) 처럼 호출하면
     * 
     *  a = (a - b - c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static sub() 를 사용하시길 바랍니다. */
    sub(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector2.#temp.assign(this);
        
        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x -= arg.x;
            temp.y -= arg.y;
        }
        return out.assign(temp);
    }


    /** out = (this * scalar). 결과는 Vector2 이며 out 을 돌려줍니다. a.mulScalar(2,a); 처럼 호출하면
     * 
     * a *= 2 를 의미하게 됩니다. 
      */
    mulScalar(scalar, out=new Vector2()) {
        return out.assign(
            this.x * scalar,
            this.y * scalar
        );
    }


    /** out = (this * v). 결과는 Vector2 이며 out 을 돌려줍니다. a.mulVector(b, a); 처럼 호출하면
     * 
     * a *= b 를 의미하게 됩니다. 
     */
    mulVector(v, out=new Vector2()) {
        return out.assign(
            this.x * v.x,
            this.y * v.y
        );
    }


    /** 벡터의 크기의 제곱을 돌려줍니다. 결과는 number 입니다. */
    get sqrMagnitude() { return Vector2.dot(this,this); }


    /** 벡터의 크기를 돌려줍니다. 결과는 number 입니다. */
    get magnitude() { return Math.sqrt(this.sqrMagnitude); }


    /** 정규화한 벡터를 돌려줍니다. 결과는 Vector2 입니다. */
    get normalized() {
        const invSize = 1.0 / this.magnitude;
        return this.mulScalar(invSize);
    }
};


/** 3차원 벡터를 정의합니다. */
export class Vector3 {
    static #temp0 = new Vector3();
    static #temp1 = new Vector3();

    x; y; z;

    /////////////////////////
    // Static Methods      //
    /////////////////////////


    /** 두 벡터의 내적(u·v)의 결과를 돌려줍니다. 결과는 number 입니다. u,v 는 Vector3/Vector4 입니다. */
    static dot(u, v) { return (u.x * v.x) + (u.y * v.y) + (u.z * v.z); }


    /** 두 벡터의 외적(u x v)의 결과를 out 에 담아 돌려줍니다. u,v 는 Vector3/Vector4 입니다. */
    static cross(u, v, out=new Vector3()) {
        return out.assign(
            u.y*v.z - u.z*v.y,
            u.z*v.x - u.x*v.z,
            u.x*v.y - u.y*v.x
        );
    }
    

    /** (a + ... + args) 의 결과를 나타내는 Vector3. 항상 복사본을 돌려줍니다. */
    static add(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x += arg.x;
            ret.y += arg.y;
            ret.z += arg.z;
        }
        return ret;
    }


    /** (a - ... - args) 의 결과를 나타내는 Vector3. 항상 복사본을 돌려줍니다. */
    static sub(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x -= arg.x;
            ret.y -= arg.y;
            ret.z -= arg.z;
        }
        return ret;
    }


    /** 스칼라 계수 s 를 통해 선형보간을 수행합니다. 결과는 (from·(1-s) + to·s) 를 나타내는 Vector3 이며,
     * 
     *  out 에 담아 돌려줍니다. s 의 범위는 [0, 1] 이지만, 범위를 벗어났는지 여부는 확인하지 않습니다.*/
    static lerp(from, to, s, out=new Vector3()) {
        const s2 = (1- s);

        return out.assign(
            from.x*s2 + to.x*s,
            from.y*s2 + to.y*s,
            from.z*s2 + to.z*s
        );
    }


    /** 두 벡터 사이의 부호 없는 사이각(radian)을 돌려줍니다. 결과는 number 입니다. */
    static angle(u, v) {
        u = u.normalize(Vector3.#temp0); // |u| = 1
        v = v.normalize(Vector3.#temp1); // |v| = 1

        const cos = MyMath.clamp(Vector3.dot(u,v), -1, 1); // |u|·|v|·cos 는 실수(real number)에서는 항상 [-1,1] 이지만, 부동소수점수(floating point number)
        return Math.acos(cos);                             // 에서는 반올림 오차(round error)로 인해 보장할 수 없으므로 clamp 를 통해 [-1, 1] 사이로 바꿔준다.
    }


    static get zero() { return new Vector3(); }
    static get one()  { return new Vector3(1,1,1); }
    static get right() { return new Vector3(1,0,0); }
    static get left() { return new Vector3(-1,0,0); }
    static get up() { return new Vector3(0,1,0); }
    static get down() { return new Vector3(0,-1,0); }
    static get forward() { return new Vector3(0,0,1); }
    static get back() { return new Vector3(0,0,-1); }


    ////////////////////////
    // Public Methods     //
    ////////////////////////


    /** (x,y,z) 를 생성합니다. 결과는 Vector3 입니다. */
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /** Vector3 를 나타내는 string 을 돌려줍니다. */
    toString() { 
        const x = MyMath.zeroOrF(this.x).toFixed(2);
        const y = MyMath.zeroOrF(this.y).toFixed(2);
        const z = MyMath.zeroOrF(this.z).toFixed(2);
        return `(${x}, ${y}, ${z})`; 
    }


    /** Vector2 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector2(out=new Vector2()) { return out.assign(this.x, this.y); }


    /** Vecotr4 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector4(w=1, out=new Vector4()) { return out.assign(this.x, this.y, this.z, w); }


    /** 자신의 복사본을 생성합니다. 결과는 Vector3 입니다. */
    clone() { return new Vector3(this.x, this.y, this.z); }


    /** this 의 각 성분들을 (x,y,z) 로 설정하고, this 를 돌려줍니다. assign(v) 처럼 호출한다면
     * 
     *  this 의 각 성분들은 (v.x, v.y, v.z) 로 설정됩니다. */
    assign(x,y,z) {

        if(arguments.length == 1) {
            const v = x;
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
        }
        else {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        return this;
    }


    /** out = (this + ... + args). 결과는 Vector3 이며 out 을 돌려줍니다. a.add(b,c,a) 처럼 호출하면
     * 
     *  a = (a + b + c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static add() 를 사용하시길 바랍니다. */
    add(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector3.#temp0.assign(this);

        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x += arg.x;
            temp.y += arg.y;
            temp.z += arg.z;
        }
        return out.assign(temp);
    }


    /** out = (this - ... - args). 결과는 Vector3 이며 out 을 돌려줍니다. a.sub(b,c,a) 처럼 호출하면
     * 
     *  a = (a - b - c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static sub() 를 사용하시길 바랍니다. */
    sub(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector3.#temp0.assign(this);

        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x -= arg.x;
            temp.y -= arg.y;
            temp.z -= arg.z;
        }
        return out.assign(temp);
    }


    /** out = (this * scalar). 결과는 Vector3 이며 out 을 돌려줍니다. a.mulScalar(2,a); 처럼 호출하면
     * 
     * a *= 2 를 의미하게 됩니다. 
      */
    mulScalar(scalar, out=new Vector3()) {
        return out.assign(
            this.x * scalar,
            this.y * scalar,
            this.z * scalar
        );
    }


    /** out = (this * v). 결과는 Vector3 이며 out 을 돌려줍니다. a.mulVector(b, a); 처럼 호출하면
     * 
     * a *= b 를 의미하게 됩니다. 
     */
    mulVector(v, out=new Vector3()) {
        return out.assign(
            this.x * v.x,
            this.y * v.y,
            this.z * v.z
        );
    }


    /** out = (this / v). 결과는 Vector3 이며 out 을 돌려줍니다. a.divVector(b, a); 처럼 호출하면
     * 
     *  a /= b 를 의미하게 됩니다.
     */
    divVector(v, out=new Vector3()) {
        return out.assign(
            this.x / v.x,
            this.y / v.y,
            this.z / v.z
        );
    }


    /** 정규화한 벡터를 out 에 담아 돌려줍니다. */
    normalize(out=new Vector3()) {
        const invSize = 1.0 / this.magnitude;
        return this.mulScalar(invSize, out);
    }


    /** 벡터의 크기의 제곱을 돌려줍니다. 결과는 number 입니다. */
    get sqrMagnitude() { return Vector3.dot(this,this); }


    /** 벡터의 크기를 돌려줍니다. 결과는 number 입니다. */
    get magnitude() { return Math.sqrt(this.sqrMagnitude); }


    /** 정규화한 벡터를 돌려줍니다. 결과는 Vector3 입니다. */
    get normalized() {
        const invSize = 1.0 / this.magnitude;
        return this.mulScalar(invSize);
    }
};


/** 4차원 벡터를 정의합니다. */
export class Vector4 {
    static #temp = new Vector4();

    x; y; z; w;

    /////////////////////////
    // Static Methods      //
    /////////////////////////


    /** 두 벡터의 내적(u·v)의 결과를 돌려줍니다. 결과는 number 입니다. */
    static dot(u, v) { return (u.x * v.x) + (u.y * v.y) + (u.z * v.z) + (u.w * v.w); }


    /** (a + ... + args) 의 결과를 나타내는 Vector4. 항상 복사본을 돌려줍니다. */
    static add(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x += arg.x;
            ret.y += arg.y;
            ret.z += arg.z;
            ret.w += arg.w;
        }
        return ret;
    }


    /** (a - ... - args) 의 결과를 나타내는 Vector4. 항상 복사본을 돌려줍니다. */
    static sub(a, ...args) {
        const ret = a.clone();

        for(const arg of args) {
            ret.x -= arg.x;
            ret.y -= arg.y;
            ret.z -= arg.z;
            ret.w -= arg.w;
        }
        return ret;
    }


    /** 스칼라 계수 s 를 통해 선형보간을 수행합니다. 결과는 (from·(1-s) + to·s) 를 나타내는 Vector4 이며,
     * 
     *  out 에 담아 돌려줍니다. s 의 범위는 [0, 1] 이지만, 범위를 벗어났는지 여부는 확인하지 않습니다. */
    static lerp(from, to, s, out=new Vector4()) {
        const s2 = (1- s);

        return out.assign(
            from.x*s2 + to.x*s,
            from.y*s2 + to.y*s,
            from.z*s2 + to.z*s,
            from.w*s2 + to.w*s
        );
    }


    ////////////////////////
    // Public Methods     //
    ////////////////////////

    /** (x, y, z, w) 를 생성합니다. w 값의 기본값은 1이며, 결과는 Vector4 입니다.*/
    constructor(x=0, y=0, z=0, w=1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    /** Vector4 를 나타내는 string 을 돌려줍니다. */
    toString() { 
        const x = MyMath.zeroOrF(this.x).toFixed(2);
        const y = MyMath.zeroOrF(this.y).toFixed(2);
        const z = MyMath.zeroOrF(this.z).toFixed(2);
        const w = MyMath.zeroOrF(this.w).toFixed(2);

        return `(${x}, ${y}, ${z}, ${w})`; 
    }


    /** Vector2 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector2(out=new Vector2()) { return out.assign(this.x, this.y); }


    /** Vector3 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toVector3(out=new Vector3()) { return out.assign(this.x, this.y, this.z); }


    /** 자신의 복사본을 생성합니다. 결과는 Vector4 입니다. */
    clone() { return new Vector4(this.x, this.y, this.z, this.w); }


    /** this 의 각 성분들을 (x,y,z,w) 로 설정하고, this 를 돌려줍니다. assign(v) 처럼 호출하면 
     * 
     *  this 의 각 성분들을 (v.x, v.y, v.z, v.w) 로 설정합니다. */
    assign(x,y,z,w) {

        if(arguments.length == 1) {
            const v = x;
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            this.w = v.w;
        }
        else {
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
        }
        return this;
    }


    /** out = (this + ... + args). 결과는 Vector4 이며 out 을 돌려줍니다. a.add(b,c,a) 처럼 호출하면
     * 
     *  a = (a + b + c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static add() 를 사용하시길 바랍니다. */
    add(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector4.#temp.assign(this);

        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x += arg.x;
            temp.y += arg.y;
            temp.z += arg.z;
            temp.w += arg.w;
        }
        return out.assign(temp);
    }


    /** out = (this - ... - args). 결과는 Vector4 이며 out 을 돌려줍니다. a.sub(b,c,a) 처럼 호출하면
     * 
     *  a = (a - b - c) 를 의미하게 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면
     * 
     *  대신 static sub() 를 사용하시길 바랍니다. */
    sub(...argsAndOut) {
        const length = argsAndOut.length-1;
        const out    = argsAndOut[length];
        const temp   = Vector4.#temp.assign(this);

        for(let i=0; i<length; ++i) {
            const arg = argsAndOut[i];
            temp.x -= arg.x;
            temp.y -= arg.y;
            temp.z -= arg.z;
            temp.w -= arg.w;
        }
        return out.assign(temp);
    }


    /** out = (this * scalar). 결과는 Vector4 이며 out 을 돌려줍니다. a.mulScalar(2,a); 처럼 호출하면
     * 
     * a *= 2 를 의미하게 됩니다. 
     */
    mulScalar(scalar, out=new Vector4()) {
        return out.assign(
            this.x * scalar,
            this.y * scalar,
            this.z * scalar,
            this.w * scalar
        );
    }


    /** out = (this * v). 결과는 Vector4 이며 out 을 돌려줍니다. a.mulVector(b, a); 처럼 호출하면
     * 
     * a *= b 를 의미하게 됩니다. 
     */
    mulVector(v, out=new Vector4()) {
        return out.assign(
            this.x * v.x,
            this.y * v.y,
            this.z * v.z,
            this.w * v.w
        );
    }
};


/** 4차원 행렬을 정의합니다. */
export class Matrix4x4 {
    static #temp0 = new Matrix4x4();
    static #temp1 = new Matrix4x4();

    basisX = new Vector4(1, 0, 0, 0); // X 기저
    basisY = new Vector4(0, 1, 0, 0); // Y 기저
    basisZ = new Vector4(0, 0, 1, 0); // Z 기저
    basisW = new Vector4(0, 0, 0, 1); // W 기저


    ///////////////////////
    // Static Methods    //
    ///////////////////////


    /** 행렬곱의 결과를 나타내는 Matrix4x4 를 생성하여 돌려줍니다. 첫번째 인자부터 곱해지기에
     * 
     * mulMat(T, R,S); 처럼 호출한다면, 그 결과는 (S · R · T) 가 됩니다. 항상 복사본을 돌려줍니다. */
    static mulMat(mat0, ...mats) {
        const ret = mat0.clone();

        for(const mat of mats) {
            const matT = mat.transpose(Matrix4x4.#temp0);

            ret.basisX.assign(
                Vector4.dot(matT.basisX, ret.basisX),
                Vector4.dot(matT.basisY, ret.basisX),
                Vector4.dot(matT.basisZ, ret.basisX),
                Vector4.dot(matT.basisW, ret.basisX),
            );
            ret.basisY.assign(
                Vector4.dot(matT.basisX, ret.basisY),
                Vector4.dot(matT.basisY, ret.basisY),
                Vector4.dot(matT.basisZ, ret.basisY),
                Vector4.dot(matT.basisW, ret.basisY),
            );
            ret.basisZ.assign(
                Vector4.dot(matT.basisX, ret.basisZ),
                Vector4.dot(matT.basisY, ret.basisZ),
                Vector4.dot(matT.basisZ, ret.basisZ),
                Vector4.dot(matT.basisW, ret.basisZ),
            );
            ret.basisW.assign(
                Vector4.dot(matT.basisX, ret.basisW),
                Vector4.dot(matT.basisY, ret.basisW),
                Vector4.dot(matT.basisZ, ret.basisW),
                Vector4.dot(matT.basisW, ret.basisW),
            );
        }
        return ret;
    }


    /** 행렬곱의 항등원(identity)을 나타내는 Matrix4x4 를 생성하여 돌려줍니다. */
    static get identity() { return new Matrix4x4(); }


    ///////////////////////
    // public Methods    //
    ///////////////////////


    /** x,y,z,w 축 기저를 가지는 Matrix4x4 를 생성합니다. 인자로 주어진 벡터들은 복사됩니다.
     * 
     * 인자를 0개 전달한다면, 단위 행렬(Identity)로 초기화됩니다. 인자를 16개 전달한다면
     * 
     * m0, m1, m2, m3, ..., m15 로 생각하며, 행렬을 행 우선으로 초기화합니다. */
    constructor(basisX, basisY, basisZ, basisW) {

        if(arguments.length == 0) {
            return;
        }
        else if(arguments.length == 16) {
            basisX = new Vector4(arguments[0], arguments[4], arguments[8], arguments[12]);
            basisY = new Vector4(arguments[1], arguments[5], arguments[9], arguments[13]);
            basisZ = new Vector4(arguments[2], arguments[6], arguments[10], arguments[14]);
            basisW = new Vector4(arguments[3], arguments[7], arguments[11], arguments[15]);
        }
        this.basisX.assign(basisX);
        this.basisY.assign(basisY);
        this.basisZ.assign(basisZ);
        this.basisW.assign(basisW);
    }


    /** 행렬의 복사본을 돌려줍니다. 결과는 Matrix4x4 입니다. */
    clone() { return new Matrix4x4(this.basisX, this.basisY, this.basisZ, this.basisW); }


    /** Matrix4x4 를 나타내는 string 을 돌려줍니다. */
    toString() {
        let ret = "";
        const m00 = `${MyMath.zeroOrF(this.m0)}`,  m01 = `${MyMath.zeroOrF(this.m1)}`,  m02 = `${MyMath.zeroOrF(this.m2)}`,  m03 = `${MyMath.zeroOrF(this.m3)}`;
        const m10 = `${MyMath.zeroOrF(this.m4)}`,  m11 = `${MyMath.zeroOrF(this.m5)}`,  m12 = `${MyMath.zeroOrF(this.m6)}`,  m13 = `${MyMath.zeroOrF(this.m7)}`;
        const m20 = `${MyMath.zeroOrF(this.m8)}`,  m21 = `${MyMath.zeroOrF(this.m9)}`,  m22 = `${MyMath.zeroOrF(this.m10)}`, m23 = `${MyMath.zeroOrF(this.m11)}`;
        const m30 = `${MyMath.zeroOrF(this.m12)}`, m31 = `${MyMath.zeroOrF(this.m13)}`, m32 = `${MyMath.zeroOrF(this.m14)}`, m33 = `${MyMath.zeroOrF(this.m15)}`;

        const maxLen0 = Math.max(m00.length, m10.length, m20.length, m30.length);
        const maxLen1 = Math.max(m01.length, m11.length, m21.length, m31.length);
        const maxLen2 = Math.max(m02.length, m12.length, m22.length, m32.length);
        const maxLen3 = Math.max(m03.length, m13.length, m23.length, m33.length);

        // 0 행
        const space00 = " ".repeat(maxLen0 - m00.length);
        const space01 = " ".repeat(maxLen1 - m01.length);
        const space02 = " ".repeat(maxLen2 - m02.length);
        const space03 = " ".repeat(maxLen3 - m03.length);
        ret += `\n[${m00}${space00} ${space01}${m01} ${space02}${m02} ${space03}${m03}]`;


        // 1 행
        const space10 = " ".repeat(maxLen0 - m10.length);
        const space11 = " ".repeat(maxLen1 - m11.length);
        const space12 = " ".repeat(maxLen2 - m12.length);
        const space13 = " ".repeat(maxLen3 - m13.length);
        ret += `\n[${m10}${space10} ${space11}${m11} ${space12}${m12} ${space13}${m13}]`;


        // 2행
        const space20 = " ".repeat(maxLen0 - m20.length);
        const space21 = " ".repeat(maxLen1 - m21.length);
        const space22 = " ".repeat(maxLen2 - m22.length);
        const space23 = " ".repeat(maxLen3 - m23.length);
        ret += `\n[${m20}${space20} ${space21}${m21} ${space22}${m22} ${space23}${m23}]`;


        // 3행
        const space30 = " ".repeat(maxLen0 - m30.length);
        const space31 = " ".repeat(maxLen1 - m31.length);
        const space32 = " ".repeat(maxLen2 - m32.length);
        const space33 = " ".repeat(maxLen3 - m33.length);
        ret += `\n[${m30}${space30} ${space31}${m31} ${space32}${m32} ${space33}${m33}]`;

        return ret;
    }


    /** 회전행렬(rotation matrix)을 나타내는 Matrix4x4 를 Quaternion 으로 변환합니다. 결과는 out 에 담아 돌려줍니다. */
    toQuaternion(out=new Quaternion()) {
        const m = this.flat;
        
        let root = 0;
        let trace = m[0] + m[5] + m[10];

        if(trace > 0) {
            root = Math.sqrt(trace + 1);
            out.w = 0.5 * root;
            root = 0.5 / root;

            out.v.assign(
                (m[6]-m[9]) * root,
                (m[8]-m[2]) * root,
                (m[1]-m[4]) * root
            );
        }
        else {
            let i    = 0;
            let next = [1,2,0];

            if(m[5] > m[0])      i = 1;
            if(m[10] > m[i*4+i]) i = 2;

            let j = next[i];
            let k = next[j];

            root = Math.sqrt(m[i*4+i] - m[j*4+j] - m[k*4+k] + 1);

            const qt = [0, 0, 0];
            qt[i] = 0.5 * root;

            root = 0.5 / root;

            qt[j] = (m[i*4+j] + m[j*4+i]) * root;
            qt[k] = (m[i*4+k] + m[k*4+i]) * root;

            out.w = (m[j*4+k] - m[k*4+j]) * root;
            out.v.assign(qt[0], qt[1], qt[2]);
        }
        return out.conjugate(out);
    }


    /** 행렬 mat 의 값으로 설정하고, this 를 돌려줍니다. */
    assign(mat) {
        this.basisX.assign(mat.basisX);
        this.basisY.assign(mat.basisY);
        this.basisZ.assign(mat.basisZ);
        this.basisW.assign(mat.basisW);
        return this;
    }


    /** 전치 행렬을 나타내는 Matrix4x4 를 out 에 담아 돌려줍니다. */
    transpose(out = new Matrix4x4()) {
        const m0  = this.m0,  m1  = this.m1,  m2  = this.m2,  m3  = this.m3;
        const m4  = this.m4,  m5  = this.m5,  m6  = this.m6,  m7  = this.m7;
        const m8  = this.m8,  m9  = this.m9,  m10 = this.m10, m11 = this.m11;
        const m12 = this.m12, m13 = this.m13, m14 = this.m14, m15 = this.m15;

        out.basisX.assign(m0, m1, m2, m3);
        out.basisY.assign(m4, m5, m6, m7);
        out.basisZ.assign(m8, m9, m10, m11);
        out.basisW.assign(m12, m13, m14, m15);

        return out;
    }


    /** (this · v) 의 결과를 나타내는 Vector4 를 out 에 담아 돌려줍니다. */
    mulVector(v, out=new Vector4()) {
        const x = v.x;
        const y = v.y;
        const z = v.z;
        const w = v.w;

        const X = this.basisX;
        const Y = this.basisY;
        const Z = this.basisZ;                         // const matT = this.transpose(Matrix4x4.#temp);
        const W = this.basisW;                         // return out.assign(
                                                       //     Vector4.dot(matT.basisX, v),
        out.x = (X.x*x) + (Y.x*y) + (Z.x*z) + (W.x*w); //     Vector4.dot(matT.basisY, v),
        out.y = (X.y*x) + (Y.y*y) + (Z.y*z) + (W.y*w); //     Vector4.dot(matT.basisZ, v),
        out.z = (X.z*x) + (Y.z*y) + (Z.z*z) + (W.z*w); //     Vector4.dot(matT.basisW, v)
        out.w = (X.w*x) + (Y.w*y) + (Z.w*z) + (W.w*w); // );

        return out;
    }


    /** 행렬곱의 결과를 나타내는 Matrix4x4 를 out 에 담아 돌려줍니다. 첫번째 인자부터 곱해지기에
     * 
     *  S.mulMat(R,T, TRS) 처럼 호출하면, 결과는 TRS = T·R·S 가 됩니다. 해당 함수는 항상 out 인자를
     * 
     *  요구하므로 복사본을 생성하고 싶다면 대신 static Matrix4x4.mulMat() 을 사용하시길 바랍니다. */
    mulMat(...matsAndOut) {
        const length = matsAndOut.length-1;
        const out    = matsAndOut[length];
        const temp   = Matrix4x4.#temp0.assign(this);
        
        for(let i=0; i<length; ++i) {
            const matT = matsAndOut[i].transpose(Matrix4x4.#temp1);

            temp.basisX.assign(
                Vector4.dot(matT.basisX, temp.basisX),
                Vector4.dot(matT.basisY, temp.basisX),
                Vector4.dot(matT.basisZ, temp.basisX),
                Vector4.dot(matT.basisW, temp.basisX),
            );
            temp.basisY.assign(
                Vector4.dot(matT.basisX, temp.basisY),
                Vector4.dot(matT.basisY, temp.basisY),
                Vector4.dot(matT.basisZ, temp.basisY),
                Vector4.dot(matT.basisW, temp.basisY),
            );
            temp.basisZ.assign(
                Vector4.dot(matT.basisX, temp.basisZ),
                Vector4.dot(matT.basisY, temp.basisZ),
                Vector4.dot(matT.basisZ, temp.basisZ),
                Vector4.dot(matT.basisW, temp.basisZ),
            );
            temp.basisW.assign(
                Vector4.dot(matT.basisX, temp.basisW),
                Vector4.dot(matT.basisY, temp.basisW),
                Vector4.dot(matT.basisZ, temp.basisW),
                Vector4.dot(matT.basisW, temp.basisW),
            );
        }
        return out.assign(temp);
    }


    /** 행렬식의 결과를 나타내는 number 를 돌려줍니다. */
    det() {
        const A11 = this.basisX.x, A12 = this.basisY.x, A13 = this.basisZ.x, A14 = this.basisW.x;
        const A21 = this.basisX.y, A22 = this.basisY.y, A23 = this.basisZ.y, A24 = this.basisW.y;
        const A31 = this.basisX.z, A32 = this.basisY.z, A33 = this.basisZ.z, A34 = this.basisW.z;
        const A41 = this.basisX.w, A42 = this.basisY.w, A43 = this.basisZ.w, A44 = this.basisW.w;

        const a = A11 * (A22*(A33*A44-A34*A43) - A23*(A32*A44-A34*A42) + A24*(A32*A43-A33*A42) );
        const b = A12 * (A21*(A33*A44-A34*A43) - A23*(A31*A44-A34*A41) + A24*(A31*A43-A33*A41) );
        const c = A13 * (A21*(A32*A44-A34*A42) - A22*(A31*A44-A34*A41) + A24*(A31*A42-A32*A41) );
        const d = A14 * (A21*(A32*A43-A33*A42) - A22*(A31*A43-A33*A41) + A23*(A31*A42-A32*A41) );

        return a-b+c-d;
    }

    
    /** 역행렬 M^(-1) 을 나타내는 Matrix4x4 를 out 에 담아 돌려줍니다. */
    inverse(out=new Matrix4x4()) {
        const det = this.det();

        if(MyMath.equalApprox(det,0)) { // 행렬식의 값이 0 이라면, 역행렬은 존재하지 않는다.
            return null;                // 고로 null 을 돌려준다.
        }
        const invDet = 1 / det;

        const m   = this.flat;
        const inv = new Float32Array(16);

        inv[0] = (
            m[5]  * m[10] * m[15] - 
            m[5]  * m[11] * m[14] - 
            m[9]  * m[6]  * m[15] + 
            m[9]  * m[7]  * m[14] +
            m[13] * m[6]  * m[11] - 
            m[13] * m[7]  * m[10]
        );
        inv[4] = (
            -m[4] * m[10] * m[15] + 
            m[4]  * m[11] * m[14] + 
            m[8]  * m[6]  * m[15] - 
            m[8]  * m[7]  * m[14] - 
            m[12] * m[6]  * m[11] + 
            m[12] * m[7]  * m[10]
        );
        inv[8] = (
            m[4]  * m[9] * m[15] - 
            m[4]  * m[11] * m[13] - 
            m[8]  * m[5] * m[15] + 
            m[8]  * m[7] * m[13] + 
            m[12] * m[5] * m[11] - 
            m[12] * m[7] * m[9]
        );
        inv[12] = (
            -m[4] * m[9] * m[14] + 
            m[4]  * m[10] * m[13] +
            m[8]  * m[5] * m[14] - 
            m[8]  * m[6] * m[13] - 
            m[12] * m[5] * m[10] + 
            m[12] * m[6] * m[9]
        );
        inv[1] = (
            -m[1] * m[10] * m[15] + 
            m[1]  * m[11] * m[14] + 
            m[9]  * m[2] * m[15] - 
            m[9]  * m[3] * m[14] - 
            m[13] * m[2] * m[11] + 
            m[13] * m[3] * m[10]
        );
        inv[5] = (
            m[0]  * m[10] * m[15] - 
            m[0]  * m[11] * m[14] - 
            m[8]  * m[2] * m[15] + 
            m[8]  * m[3] * m[14] + 
            m[12] * m[2] * m[11] - 
            m[12] * m[3] * m[10]
        );
        inv[9] = (
            -m[0] * m[9] * m[15] + 
            m[0]  * m[11] * m[13] + 
            m[8]  * m[1] * m[15] - 
            m[8]  * m[3] * m[13] - 
            m[12] * m[1] * m[11] + 
            m[12] * m[3] * m[9]
        );
        inv[13] = (
            m[0]  * m[9] * m[14] - 
            m[0]  * m[10] * m[13] - 
            m[8]  * m[1] * m[14] + 
            m[8]  * m[2] * m[13] + 
            m[12] * m[1] * m[10] - 
            m[12] * m[2] * m[9]
        );
        inv[2] = (
            m[1]  * m[6] * m[15] - 
            m[1]  * m[7] * m[14] - 
            m[5]  * m[2] * m[15] + 
            m[5]  * m[3] * m[14] + 
            m[13] * m[2] * m[7] - 
            m[13] * m[3] * m[6]
        );
        inv[6] = (
            -m[0]  * m[6] * m[15] + 
            m[0]  * m[7] * m[14] + 
            m[4]  * m[2] * m[15] - 
            m[4]  * m[3] * m[14] - 
            m[12] * m[2] * m[7] + 
            m[12] * m[3] * m[6]
        );
        inv[10] = (
            m[0]  * m[5] * m[15] - 
            m[0]  * m[7] * m[13] - 
            m[4]  * m[1] * m[15] + 
            m[4]  * m[3] * m[13] + 
            m[12] * m[1] * m[7] - 
            m[12] * m[3] * m[5]
        );
        inv[14] = (
            -m[0]  * m[5] * m[14] + 
            m[0]  * m[6] * m[13] + 
            m[4]  * m[1] * m[14] - 
            m[4]  * m[2] * m[13] - 
            m[12] * m[1] * m[6] + 
            m[12] * m[2] * m[5]
        );
        inv[3] = (
            -m[1] * m[6] * m[11] + 
            m[1] * m[7] * m[10] + 
            m[5] * m[2] * m[11] - 
            m[5] * m[3] * m[10] - 
            m[9] * m[2] * m[7] + 
            m[9] * m[3] * m[6]
        );
        inv[7] = (
            m[0] * m[6] * m[11] - 
            m[0] * m[7] * m[10] - 
            m[4] * m[2] * m[11] + 
            m[4] * m[3] * m[10] + 
            m[8] * m[2] * m[7] - 
            m[8] * m[3] * m[6]
        );
        inv[11] = (
            -m[0] * m[5] * m[11] + 
            m[0] * m[7] * m[9] + 
            m[4] * m[1] * m[11] - 
            m[4] * m[3] * m[9] - 
            m[8] * m[1] * m[7] + 
            m[8] * m[3] * m[5]
        );
        inv[15] = (
            m[0] * m[5] * m[10] - 
            m[0] * m[6] * m[9] - 
            m[4] * m[1] * m[10] + 
            m[4] * m[2] * m[9] + 
            m[8] * m[1] * m[6] - 
            m[8] * m[2] * m[5]
        );

        out.basisX.assign(inv[0], inv[4], inv[8], inv[12]).mulScalar(invDet, out.basisX);
        out.basisY.assign(inv[1], inv[5], inv[9], inv[13]).mulScalar(invDet, out.basisY);
        out.basisZ.assign(inv[2], inv[6], inv[10], inv[14]).mulScalar(invDet, out.basisZ);
        out.basisW.assign(inv[3], inv[7], inv[11], inv[15]).mulScalar(invDet, out.basisW);

        return out;
    }


    /**  */
    get m0() { return this.basisX.x; } set m0(value) { return this.basisX.x = value; }
    get m1() { return this.basisY.x; } set m1(value) { return this.basisY.x = value; }
    get m2() { return this.basisZ.x; } set m2(value) { return this.basisZ.x = value; }
    get m3() { return this.basisW.x; } set m3(value) { return this.basisW.x = value; }

    get m4() { return this.basisX.y; } set m4(value) { return this.basisX.y = value; }
    get m5() { return this.basisY.y; } set m5(value) { return this.basisY.y = value; }
    get m6() { return this.basisZ.y; } set m6(value) { return this.basisZ.y = value; }
    get m7() { return this.basisW.y; } set m7(value) { return this.basisW.y = value; }

    get m8()  { return this.basisX.z; } set m8(value) { return this.basisX.z = value; }
    get m9()  { return this.basisY.z; } set m9(value) { return this.basisY.z = value; }
    get m10() { return this.basisZ.z; } set m10(value) { return this.basisZ.z = value; }
    get m11() { return this.basisW.z; } set m11(value) { return this.basisW.z = value; }

    get m12() { return this.basisX.w; } set m12(value) { return this.basisX.w = value; }
    get m13() { return this.basisY.w; } set m13(value) { return this.basisY.w = value; }
    get m14() { return this.basisZ.w; } set m14(value) { return this.basisZ.w = value; }
    get m15() { return this.basisW.w; } set m15(value) { return this.basisW.w = value; }


    /** Matrix4x4 를  */
    get flat() {
        return new Float32Array([
            this.m0,  this.m1,  this.m2,  this.m3,
            this.m4,  this.m5,  this.m6,  this.m7,
            this.m8,  this.m9,  this.m10, this.m11,
            this.m12, this.m13, this.m14, this.m15
        ]);
    }
};


/** 사원수를 정의합니다. */
export class Quaternion {

    static #mulQuat = [
        (x,y,z,out) => x.mulQuat(y, z, out), // EulerXYZ
        (x,y,z,out) => x.mulQuat(z, y, out), // EulerXZY
        (x,y,z,out) => y.mulQuat(z, x, out), // EulerYZX
        (x,y,z,out) => y.mulQuat(x, z, out), // EulerYXZ
        (x,y,z,out) => z.mulQuat(x, y, out), // EulerZXY
        (x,y,z,out) => z.mulQuat(y, x, out)  // EulerZYX
    ];
    static #toEuler = [
        toEulerXYZ, // EulerXYZ
        toEulerXZY, // EulerXZY
        toEulerYZX, // EulerYZX
        toEulerYXZ, // EulerYXZ
        toEulerZXY, // EulerZXY
        toEulerZYX, // EulerZYX
    ];
    static #temp0 = new Vector3();    // static fromTo()  : temp0, temp1
    static #temp1 = new Vector3();    // static euler()   : temp0, temp1, temp2, temp6, temp7, temp8 (call mulQuat)
    static #temp2 = new Vector3();    // static mulQuat() : temp0, temp1, temp2
    static #temp3 = new Vector3();    // toMatrix4x4()    : temp3, temp4, temp5 (call mulVector)
    static #temp4 = new Vector3();    // mulQuat()        : temp0, temp1, temp2, temp9
    static #temp5 = new Vector3();    // mulVector()      : temp0, temp1, temp2
    static #temp6 = new Quaternion();
    static #temp7 = new Quaternion();
    static #temp8 = new Quaternion();
    static #temp9 = new Quaternion();

    w; v; 


    /////////////////////////
    // Static methods      //
    /////////////////////////


    /** axis 축으로 angle 도 만큼의 회전을 나타내는 Quaternion 을 out 에 담아 돌려줍니다.
     * 
     * Quaternion.angleAxis 로 만든 회전은 임의의 한 축에 대해서 회전하기에, 짐벌락(gimbal-lock) 현상이 없습니다. */
    static angleAxis(angle, axis, out=new Quaternion()) {
        angle *= MyMath.DEG2RAD1_2;

        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        out.w = cos;
        axis.mulScalar(sin, out.v);

        return out; // (cosθ, sinθ·axis)
    }


    /** from 방향에서 to 방향으로 향하도록 회전시키는 Quaternion 을 out 에 담아 돌려줍니다. */
    static fromTo(from, to, out=new Quaternion()) {
        const angle = Vector3.angle(from,to) * MyMath.RAD2DEG; // Quaternion 은 항상 from 에서 to 로 시계방향으로 회전시키는
                                                               // 회전을 만들어내므로, angle 은 항상 부호가 없어야 한다.
        if(angle==180 || angle == 0) {
            const temp1 = Quaternion.#temp1;                                // 0|180 도 회전을 하는 경우, (from x to) = (0,0,0) 이 되어 계산이 불가능해진다.
            to = (from.y != 0) ? temp1.assign(1,0,0) : temp1.assign(0,1,0); // 고로 from 과 평행하지 않는 임의의 축 (1,0,0) 또는 (0,1,0) 을 to 로 사용한다.
        }
        const cross = Vector3.cross(from,to, Quaternion.#temp0); // |(from x to)| = |from|·|to|·sin 이므로, |from| = |to| = 1 이라고 하더라도
        const axis  = cross.normalize(cross);                    // sin 때문에 크기가 1이 아닐 수 있으므로 정규화를 해주어야 한다.
        return Quaternion.angleAxis(angle, axis, out);
    }


    /** X = (1,0,0) 축에 대해 x deg 회전, Y = (0,1,0) 축에 대해 y deg 회전, -Z = (0,0,-1) 축에 대해 z deg 회전하는 회전을 나타내는 Quaternion 을 out 에 담아 돌려줍니다.
     * 
     * 회전 순서는 RotationOrder 열거형을 참고하시길 바랍니다. 기본 순서는 EulerYXZ 입니다. Quaternion.euler 로 생성한 회전은 오일러각을 사용했기 때문에
     * 
     * 여전히 짐벌락(gimbal-lock) 현상이 존재함에 유의하시길 바랍니다.*/
    static euler(x, y, z, order=RotationOrder.EulerYXZ, out=new Quaternion()) {
        const basisX = Quaternion.#temp0.assign(1, 0, 0);  // X 축 (= Vector3.right)
        const basisY = Quaternion.#temp1.assign(0, 1, 0);  // Y 축 (= Vector3.up)
        const basisZ = Quaternion.#temp2.assign(0, 0, -1); // -Z 축 (= Vector3.back)

        const pitch = Quaternion.angleAxis(x, basisX, Quaternion.#temp6);
        const yaw   = Quaternion.angleAxis(y, basisY, Quaternion.#temp7);
        const roll  = Quaternion.angleAxis(z, basisZ, Quaternion.#temp8);

        return Quaternion.#mulQuat[order](pitch, yaw, roll, out); // order 에 명시된 순서대로 Quaternion.mulQuat() 에 인자를 전달한다.
    }


    /** 사원수를 오일러각(Euler angles)을 나타내는 Vector3 로 변환한 결과를 out 에 담아 돌려줍니다.
     * 
     *  X+, Y+, Z+ 축에 대한 각도를 나타내는 (x, y, z) 입니다. 그렇기에 Quaternion.euler() 에 줄때에는
     * 
     *  Quaternion.euler(x, y, -z) 처럼 인자를 주어야 합니다.
     */
    static toEuler(q, order=RotationOrder.EulerYXZ, out=new Vector3()) {
        return Quaternion.#toEuler[order](q, out);
    }


    /** 사원수곱의 결과를 나타내는 Quaternion 을 생성하여 돌려줍니다. Quaternion.mulQuat(q1, q2, q3) 처럼 호출하면
     * 
     * 결과는 (q3 · q2 · q1) 이 됩니다. 항상 복사본을 돌려줍니다. */
    static mulQuat(q, ...quats) {
        const temp0 = Quaternion.#temp0;
        const temp1 = Quaternion.#temp1;
        const temp2 = Quaternion.#temp2;
        const q1    = q.clone();

        // q2 · q1 = (w2, v2)·(w1, v1) = (w2·w1 - (v2·v1), (v2 x v1) + (w1·v2) + (w2·v1) )
        for(const q2 of quats) {
            const w1w2  = q2.w * q1.w;                      // w2·w1
            const v2v1  = Vector3.dot(q2.v, q1.v);          // (v2·v1)
            const v2xv1 = Vector3.cross(q2.v, q1.v, temp0); // (v2 x v1)
            const w1v2  = q2.v.mulScalar(q1.w, temp1);      // (w1·v2)
            const w2v1  = q1.v.mulScalar(q2.w, temp2);      // (w2·v1)

            q1.w = w1w2 - v2v1;          // q1.w = w2·w1 - (v2·v1)
            v2xv1.add(w1v2, w2v1, q1.v); // q1.v = (v2 x v1) + (w1·v2) + (w2·v1)
        }
        return q1;
    }


    /** 정규화된 시간 t 에 대해 qstart 에서 qend 까지 선형보간합니다. 결과는 qstart·(1-t) + qend·t 이며 정규화한 후에 out 에 담아 돌려줍니다.
     * 
     *  단순히 두 4차원 점들을 선형보간한 후, 크기가 1이 되도록 정규화시키기에 보간의 속도가 일정하지 않습니다. 또한 nlerp() 는 항상
     * 
     *  최단 경로(shortest path)로 회전을 보간하려고 하며, qstart, qend 가 다른 반구(hemi-sphere)위의 벡터라면, qend 의 부호를 뒤집습니다. */
    static nlerp(qstart, qend, t, out=new Quaternion()) {
        const t2 = 1-t;

        if(Quaternion.dot(qstart, qend) < 0) { // 내적 <qstart, qend> 의 결과가 음수라면, 두 사원수는 다른 반구(hemi-sphere)
            qend = qend.mulScalar(-1, out);    // 위에 있다는 의미가 된다. 최단 경로의 보간을 위해 qend 의 부호를 반대로 설정한다.
        }

        out.w   = (qstart.w   * t2) + (qend.w   * t); // out.w = qstart.w · (1-t) + qend.w · t
        out.v.x = (qstart.v.x * t2) + (qend.v.x * t); // out.v = qstart.v · (1-t) + qend.v · t
        out.v.y = (qstart.v.y * t2) + (qend.v.y * t);
        out.v.z = (qstart.v.z * t2) + (qend.v.z * t);
        
        return out.normalize(out); // out / |out|
    }


    /** 정규화된 시간 t 에 대해 qstart 에서 qend 까지 구형보간합니다. */
    static slerp(qstart, qend, t, out=new Quaternion()) {

    }


    /** 사원수 q0, q1 를 4차원 벡터로 생각하고, 내적 <q0, q1> 의 결과를 돌려줍니다. 결과는 number 입니다. */
    static dot(q0, q1) { return (q0.w * q1.w) + Vector3.dot(q0.v, q1.v); }


    /** 사원수곱의 항등원(identity)을 나타내는 Quaternion 을 생성하여 돌려줍니다. */
    static get identity() { return new Quaternion(); }


    /////////////////////////
    // Instance methods    //
    /////////////////////////

    
    /** (w, v) 인 사원수를 생성합니다. 벡터부에 해당하는 v 는 복사됩니다.
     * 
     * 인자가 없다면 (1, (0,0,0)) 인 단위 사원수로 초기화됩니다.
     */
    constructor(w=1, v=Vector3.zero) {
        this.w = w;
        this.v = v.clone();
    }


    /** 이 사원수의 복사본을 돌려줍니다. 결과는 Quaternion 입니다. */
    clone() { return new Quaternion(this.w, this.v); }


    /** this 의 각 성분을 q의 성분으로 설정합니다. 반환값은 this 입니다. */
    assign(q) {
        this.w = q.w;
        this.v.assign(q.v);
        return this;
    }


    /** Quaternion 을 나타내는 string 을 돌려줍니다. */
    toString(angleAxis=false) { 

        if(angleAxis) {
            const acos  = Math.acos(this.w);
            const angle = acos * 2 * MyMath.RAD2DEG;
            const axis  = this.v.mulScalar(1 / Math.sin(acos));
            return `angle = ${angle}, axis = ${axis}`;
        }
        return `(${MyMath.zeroOrF(this.w)}, ${this.v})`;
    }


    /** Quaternion 을 Matrix4x4 로 변환한 결과를 out 에 담아 돌려줍니다. 표준기저벡터 X,Y,Z 에 q 를 곱한 결과를
     * 
     * Matrix4x4 의 basisX, basisY, basisZ 로 사용합니다. basisW 는 (0,0,0,1) 로 초기화됩니다. */
    toMatrix4x4(out=new Matrix4x4()) {
        const basisX = Quaternion.#temp3.assign(1, 0, 0); // X 기저
        const basisY = Quaternion.#temp4.assign(0, 1, 0); // Y 기저
        const basisZ = Quaternion.#temp5.assign(0, 0, 1); // Z 기저
        
        this.mulVector(basisX, basisX); // basisX = (q · basisX · q*)
        this.mulVector(basisY, basisY); // basisY = (q · basisY · q*)
        this.mulVector(basisZ, basisZ); // basisZ = (q · basisZ · q*)

        out.basisX.assign(basisX.x, basisX.y, basisX.z, 0);
        out.basisY.assign(basisY.x, basisY.y, basisY.z, 0);
        out.basisZ.assign(basisZ.x, basisZ.y, basisZ.z, 0);
        out.basisW.assign(0, 0, 0, 1);

        return out;
    }


    /** 사원수곱의 결과를 나타내는 Quaternion 을 out 에 담아 돌려줍니다. 첫번째 인자부터 곱해지기에 q0.mulQuat(q1,q2, out) 처럼 호출하면 결과는 
     * 
     *  out = (q2 · q1 · q0) 가 됩니다. 해당 함수는 항상 out 인자를 요구하므로, 복사본을 생성하고 싶다면 대신 static Quaternion.mulQuat() 을 사용하시길 바랍니다.
     */
    mulQuat(...quatsAndOut) {
        const temp0 = Quaternion.#temp0;
        const temp1 = Quaternion.#temp1;
        const temp2 = Quaternion.#temp2;

        const length = quatsAndOut.length-1;
        const out    = quatsAndOut[length];
        const q1     = Quaternion.#temp9.assign(this);

        // q1 = (q2 · q1) = (w2, v2)·(w1, v1) = (w2·w1 - (v2·v1), (v2 x v1) + (w1·v2) + (w2·v1) )
        for(let i=0; i<length; ++i) {
            const q2 = quatsAndOut[i];

            const w1w2  = q2.w * q1.w;                      // w2·w1
            const v2v1  = Vector3.dot(q2.v, q1.v);          // (v2·v1)
            const v2xv1 = Vector3.cross(q2.v, q1.v, temp0); // (v2 x v1)
            const w1v2  = q2.v.mulScalar(q1.w, temp1);      // (w1·v2)
            const w2v1  = q1.v.mulScalar(q2.w, temp2);      // (w2·v1)

            q1.w = w1w2 - v2v1;          // q1.w = w2·w1 - (v2·v1)
            v2xv1.add(w1v2, w2v1, q1.v); // q1.v = (v2 x v1) + (w1·v2) + (w2·v1)
        }
        return out.assign(q1); // out = q1
    }


    /** (scalar · q) 의 결과를 나타내는 Quaternion 을 돌려줍니다. 회전사원수에 스칼라값을 곱하는 것은 일반적으로 큰 의미는 없습니다.
     * 
     *  예를 들어 (2 · q) 는 사원수의 크기가 2 가 되어, 더이상 회전을 나타내지 않기 때문이죠. 반면 스칼라값이 -1 이라면, 스칼라곱은
     * 
     *  회전 사원수의 회전축과 회전각을 반대로 만든다는 의미를 가지게 됩니다. 물론 이것이 회전의 역(inverse)을 의미하는 것은 아니며,
     * 
     *  단순히 사원수가 대척점(antipodal) 성질을 가지기에 큰 각도로 회전할지, 작은 각도로 회전할지 여부만 달라지는 것 뿐이며 결과는 동일합니다. */
    mulScalar(scalar, out=new Quaternion()) {
        out.w   = this.w   * scalar;
        out.v.x = this.v.x * scalar;
        out.v.y = this.v.y * scalar;
        out.v.z = this.v.z * scalar;
        return out;
    }


    /** (q·v·q*) 의 결과를 나타내는 Vector3 를 out 에 담아 돌려줍니다. 결과는 회전된 벡터이며,
     * 
     * 회전 원리는 로드리게스(rodrigues) 회전 공식과 같습니다.*/
    mulVector(v, out=new Vector3()) {
        const temp0 = Quaternion.#temp0;
        const temp1 = Quaternion.#temp1;
        const temp2 = Quaternion.#temp2;
        
        const r   = this.v;
        const rxv = Vector3.cross(r, v, temp0); // rxv = (r x v)
        const t   = rxv.mulScalar(2, temp0);    // t   = 2·(r x v)
        const rxt = Vector3.cross(r, t, temp1); // rxt = (r x t)
        const wt  = t.mulScalar(this.w, temp2); // wt  = (w·t)

        out.x = (v.x + wt.x + rxt.x); // v.add(out, wt, rxt);
        out.y = (v.y + wt.y + rxt.y);
        out.z = (v.z + wt.z + rxt.z);

        return out; // (r x t) + (w·t) + v
    }


    /** 켤레 사원수 q* 를 나타내는 Quaternion 을 out 에 담아 돌려줍니다. (q* · q) = (|q|^2, (0,0,0) ) 인데, 여기서 q 가 크기가 1인 사원수였다면
     * 
     * q* 는 역원이 되어 q^(-1) 이 되게 됩니다. 회전 사원수는 크기가 1이므로 항상 q^(-1) 을 돌려준다고 할 수 있습니다.*/
    conjugate(out=new Quaternion()) {
        out.assign(this);
        out.v.mulScalar(-1, out.v); // -1 * v
        return out;
    }


    /** 사원수의 크기가 1이 되도록 정규화시킨 결과를 out 에 담아 돌려줍니다. */
    normalize(out=new Quaternion()) {
        const invSize = 1 / this.magnitude;  // invSize = 1 / |q|
        return this.mulScalar(invSize, out); // out     = q / |q|
    }


    /** 사원수의 크기의 제곱 |q|^2 를 돌려줍니다. 결과는 number 입니다. */
    get sqrMagnitude() { return Quaternion.dot(this, this); }


    /** 사원수의 크기 |q| 를 돌려줍니다. 결과는 number 입니다. */
    get magnitude() { return Math.sqrt(this.sqrMagnitude); }
};


/** 듀얼 사원수를 정의합니다. */
export class DualQuaternion {
    static #temp0 = new Quaternion();
    static #temp1 = new Quaternion();
    static #temp2 = new Vector3();
    static #temp3 = new Vector3();
    static #temp4 = new Vector3();
    static #temp5 = new DualQuaternion();

    real; dual;


    ////////////////////////
    // Static methods     //
    ////////////////////////


    /** rotate 만큼 회전한 후에, translate 만큼 이동시키는 트랜스폼(transform)을 나타내는 DualQuaternion 을 out 에 담아 돌려줍니다. 
     * 
     *  rotate 는 회전사원수를 나타내는 Quaternion 이며, translate 는 이동벡터 t = (tx, ty, tz) 입니다. */
    static rotateTranslate(rotate=new Quaternion(), translate=Vector3.zero, out=new DualQuaternion()) {
        const r = rotate;
        const t = DualQuaternion.#temp0;

        t.w = 0;
        t.v.assign(translate);

        out.real.assign(r);                // real = r
        out.dual.assign(r);                // dual = r
        out.dual.mulQuat(t, out.dual);     // dual = t · r
        out.dual.mulScalar(0.5, out.dual); // dual = t/2 · r

        return out; // (r, t/2 · r)
    }


    /** out = (dqN · ... · dq1 · dq0). 결과는 DualQuaternion 이며 항상 복사본을 돌려줍니다. 첫번째 인자부터 곱해지기에
     * 
     *  DualQuaternion.mulQuat(dq0, dq1, dq2) 처럼 호출하면, (dq2 · dq1 · dq0) 을 의미하게 됩니다. */
    static mulDQ(dq, ...dqs) {
        const temp0 = DualQuaternion.#temp0;
        const temp1 = DualQuaternion.#temp1;

        const dq0 = dq.clone(); // dq0 = (r, d)
        
        // (dq1 · dq0) = (r`, d`)·(r, d) = (r`·r,  (r`·d) + (d`·r))
        for(const dq1 of dqs) {                // dq1   = (r`, d`)
            dq0.dual.mulQuat(dq1.real, temp0); // temp0 = (r` · d)
            dq0.real.mulQuat(dq1.dual, temp1); // temp1 = (d` · r)

            dq0.real.mulQuat(dq1.real, dq0.real); // dq0.real = (r`·r)
            dq0.dual.w = temp0.w + temp1.w;       // dq0.dual = (r`·d) + (d`·r)
            temp0.v.add(temp1.v, dq0.dual.v);
        }
        return dq0;
    }


    /** 듀얼사원수곱의 항등원(identity)을 나타내는 DualQuaternion 을 생성하여 돌려줍니다. */
    static get identity() { return new DualQuaternion(); }


    ////////////////////////
    // Instance methods   //
    ////////////////////////


    /** (real, dual) 인 DualQuaternion 을 생성합니다. 인자로 준 Quaternion 은 복사되며, 인자를 주지 않으면 (1,0) 으로 초기화됩니다. */
    constructor(real=new Quaternion(), dual=new Quaternion(0)) {
        this.real = real.clone();
        this.dual = dual.clone();
    }


    /**  */
    assign(dq) {
        this.real.assign(dq.real);
        this.dual.assign(dq.dual);
        return this;
    }


    /**  */
    clone() { return new DualQuaternion(this.real, this.dual); }


    /** DualQuaternion 을 나타내는 string 을 돌려줍니다. */
    toString(rotateTranslate=false) { 

        if(rotateTranslate) {
            return `rotation : ${this.rotation.toString(true)}\nposition : ${this.position}`;
        }
        return `\nreal: ${this.real}\ndual: ${this.dual}`; 
    }


    /** DualQuaternion 을 Matrix4x4 로 변환한 결과를 out 에 담아 돌려줍니다. */
    toMatrix4x4(out=new Matrix4x4()) {
        const r = this.real;
        const t = DualQuaternion.#temp0.v;

        r.toMatrix4x4(out);                  // out = R
        this.getPosition(t);                 // t   = 2 · dual · r*
        out.basisW.assign(t.x, t.y, t.z, 1); // out = T · R

        return out; // T·R
    }


    /** out = (this + dq). 결과는 DualQuaternion 이며 out 에 담아 돌려줍니다. */
    add(dq, out=new DualQuaternion()) {
        const r0 = this.real;
        const d0 = this.dual;

        const r1 = dq.real;
        const d1 = dq.dual;

        out.real.w   = r0.w + r1.w;     // out.real.w = r0 + r1
        out.real.v.x = r0.v.x + r1.v.x; 
        out.real.v.y = r0.v.y + r1.v.y;
        out.real.v.z = r0.v.z + r1.v.z;

        out.dual.w   = d0.w + d1.w;     // out.dual.w = d0 + d1
        out.dual.v.x = d0.v.x + d1.v.x; 
        out.dual.v.y = d0.v.y + d1.v.y;
        out.dual.v.z = d0.v.z + d1.v.z;

        return out; // out = (r0+r1, d0+d1)
    }


    /** out = (this · scalar) 결과는 DualQuaternion 이며 out 에 담아 돌려줍니다. */
    mulScalar(scalar, out=new DualQuaternion()) {
        const r = this.real;
        const d = this.dual;

        r.mulScalar(scalar, out.real); // out.real = scalar · r
        d.mulScalar(scalar, out.dual); // out.dual = scalar · d

        return out; // out = (r·scalar, d·scalar)
    }


    /** out = (dqN · ... · dq1 · dq0). 결과는 DualQuaternion 이며, out 에 담아 돌려줍니다. 첫번째 인자부터 곱해지기에 dq0.mulDQ(dq1, dq2, out) 처럼 호출하면
     * 
     *  out = (dq2 · dq1 · dq0) 을 의미하게 됩니다. 항상 out 인자를 요구하므로, 복사본을 생성하고 싶으면 대신 static mulDQ() 를 사용하시길 바랍니다.*/
    mulDQ(...dqsAndOut) {
        const temp0 = DualQuaternion.#temp0;
        const temp1 = DualQuaternion.#temp1;

        const length = dqsAndOut.length-1;
        const out    = dqsAndOut[length];
        const dq0    = DualQuaternion.#temp5.assign(this);

        // dq0 = (dq1 · dq0) = (r`, d`)·(r, d) = (r`·r,  (r`·d) + (d`·r))
        for(let i=0; i<length; ++i) {
            const dq1 = dqsAndOut[i];

            dq0.dual.mulQuat(dq1.real, temp0); // temp0 = (r` · d)
            dq0.real.mulQuat(dq1.dual, temp1); // temp1 = (d` · r)

            dq0.real.mulQuat(dq1.real, dq0.real); // dq0.real = (r`·r)
            dq0.dual.w = temp0.w + temp1.w;       // dq0.dual = (r`·d) + (d`·r)
            temp0.v.add(temp1.v, dq0.dual.v);
        }
        return out.assign(dq0);
    }


    /** (dq·p·dq*) 의 결과를 나타내는 Vector3 를 out 에 담아 돌려줍니다. 결과는 회전, 이동 변환이 적용된
     * 
     *  점 R(p) + t 를 의미합니다 (dq* 은 여기서 dual number conjugate 를 의미합니다) */
    mulVector(p, out=new Vector3()) {
        const r = this.real;
        const t = DualQuaternion.#temp0.v;

        r.mulVector(p, out); // out = R(p)
        this.getPosition(t); // t   = 2 · dual · r*

        out.x += t.x;
        out.y += t.y;
        out.z += t.z;

        return out; // R(p) + t
    }


    /** quaternion conjugate (real*, dual*) 를 나타내는 DualQuaternion 을 얻습니다. 
     * 
     *  강체 변환(rigid transformation)을 나타내는 단위 듀얼 사원수(Unit dual quaternion)이라는
     * 
     *  가정 하에 quaternion conjugate 는 R-1(p - t) 변환을 나타냅니다.
    */
    conjugate(out=new DualQuaternion()) {
        this.real.conjugate(out.real); // out.real = real*
        this.dual.conjugate(out.dual); // out.dual = dual*

        return out; // out = (real*, dual*)
    }


    /** dual number conjugate (real*, -dual*) 를 나타내는 DualQuaternion 을 얻습니다. */
    dnConjugate(out=new DualQuaternion()) {
        this.real.conjugate(out.real);    // out.real = real*
        this.dual.conjugate(out.dual);    // out.dual = dual*
        out.dual.mulScalar(-1, out.dual); // out.dual = -dual*

        return out; // out = (real*, -dual*)
    }


    /** 듀얼 사원수를 정규화한 결과를 out 에 담아 돌려줍니다. */
    normalize(out=new DualQuaternion()) {
        const magnitude = this.magnitude;
        return this.mulScalar(1/magnitude, out);
    }


    /** 듀얼 사원수에서 이동벡터(translation)을 나타내는 Vector3 를 추출합니다. 결과는 out 에 담아 돌려줍니다. */
    getPosition(out=new Vector3()) {
        const temp1 = DualQuaternion.#temp1;
        const temp2 = DualQuaternion.#temp2;
        const temp3 = DualQuaternion.#temp3;
        const temp4 = DualQuaternion.#temp4;

        const q1 = this.real.conjugate(temp1); // q1 = real*
        const q2 = this.dual;                  // q2 = dual

        const v2xv1 = Vector3.cross(q2.v, q1.v, temp2); // temp2 = (v2 x v1)
        const w1v2  = q2.v.mulScalar(q1.w, temp3);      // temp3 = (w1 · v2)
        const w2v1  = q1.v.mulScalar(q2.w, temp4);      // temp4 = (w2 · v1)

        v2xv1.add(w1v2, w2v1, out);   // out = dual · real*
        return out.mulScalar(2, out); // out = 2 · dual · real*
    }


    /** 듀얼 사원수에서 이동 벡터(translation)를 나타내는 Vector3 를 추출합니다. 항상 복사본을 돌려줍니다. */
    get position() { return this.getPosition(); }
    set position(t) {
        const temp = DualQuaternion.#temp0;

        temp.w = 0;                         // temp.w = (0, v)
        t.mulScalar(0.5, temp.v);           // temp.v = (0, t/2)
        this.real.mulQuat(temp, this.dual); // this.dual = (0, t/2) · real

        return t;
    }

    /** 듀얼 사원수에서 회전(rotation)을 나타내는 Quaternion 을 추출합니다. 항상 복사본을 돌려줍니다. */
    get rotation() { return this.real.clone(); }
    set rotation(r) { 
        const invReal = this.real.conjugate(DualQuaternion.#temp0); // invReal = real*
        const dual    = DualQuaternion.#temp1.assign(this.dual);    // dual    = dual
        
        r.mulQuat(invReal, dual, this.dual); // this.dual = dual · real* · r
        this.real.assign(r);                 // this.real = r

        return r;
    }


    /** 듀얼 사원수의 크기의 제곱 |dq|^2 을 나타내는 number 를 돌려줍니다.  */
    get sqrMagnitude() { return this.real.sqrMagnitude; }


    /** 듀얼 사원수의 크기 |dq| 를 나타내는 number 를 돌려줍니다. */
    get magnitude() { return Math.sqrt(this.sqrMagnitude); }
};



/** Quaternion.euler(x,y,z, RotationOrder.EulerXYZ) 에서 사용된 오일러각 (x,y,-z)를 구합니다. */
export function toEulerXYZ(q, out=new Vector3()) {
    const a = q.w;   // cz*cy*cx + sz*sy*sx
    const b = q.v.x; // cz*cy*sx - sz*sy*cx
    const c = q.v.y; // cy*sz*sx + cz*sy*cx
    const d = q.v.z; // -cz*sy*sx + cy*sz*cx
    
    const sx = 2*(a*b + c*d);                    // sin(x)
    const cx = 1-2*(b*b + c*c);                  // cos(x)
    const sy = MyMath.clamp(2*(a*c-b*d), -1, 1); // sin(y)
    const sz = 2*(a*d+b*c);                      // sin(z)
    const cz = 1-2*(c*c+d*d);                    // cos(z)

    return out.assign(
        Math.atan2(sx, cx) * MyMath.RAD2DEG,
        Math.asin(sy) * MyMath.RAD2DEG,
        Math.atan2(sz, cz) * MyMath.RAD2DEG
    );
}


/** Quaternion.euler(x,y,z, RotationOrder.EulerXZY) 에서 사용된 오일러각 (x,y,-z)를 구합니다.  */
export function toEulerXZY(q, out=new Vector3()) {

}


/** Quaternion.euler(x,y,z, RotationOrder.EulerYZX) 에서 사용된 오일러각 (x,y,-z)를 구합니다. */
export function toEulerYZX(q, out=new Vector3()) {
    
}


/** Quaternion.euler(x,y,z, RotationOrder.EulerYXZ) 에서 사용된 오일러각 (x,y,-z)를 구합니다.  */
export function toEulerYXZ(q, out=new Vector3()) {
    const a = q.w;   // cz*cx*cy - sz*sx*sy
    const b = q.v.x; // cz*sx*cy - cx*sz*sy
    const c = q.v.y; // cz*cx*sy + sz*sx*cy
    const d = q.v.z; // cz*sx*sy + cx*sz*cy

    const sx = MyMath.clamp(2*(a*b + c*d), -1, 1); // sin(x)
    const sy = 2*(a*c - b*d);                      // sin(y)
    const cy = 1-2*(b*b + c*c);                    // cos(y)
    const sz = 2*(a*d - b*c);                      // sin(z)
    const cz = 1-2*(b*b + d*d);                    // cos(z)

    return out.assign(
        Math.asin(sx) * MyMath.RAD2DEG,
        Math.atan2(sy, cy) * MyMath.RAD2DEG,
        Math.atan2(sz, cz) * MyMath.RAD2DEG
    );
}


/** Quaternion.euler(x,y,z, RotationOrder.EulerZXY) 에서 사용된 오일러각 (x,y,-z)를 구합니다. */
export function toEulerZXY(q, out=new Vector3()) {
    const a = q.w;
    const b = q.v.x;
    const c = q.v.y;
    const d = q.v.z;

    const sx = MyMath.clamp(2*(a*b - c*d), -1, 1); // sin(x)
    const sy = 2*(a*c+b*d);                        // sin(y)
    const cy = 1-2*(b*b+c*c);                      // cos(y)
    const sz = 2*(a*d+b*c);                        // sin(z)
    const cz = 1-2*(d*d+b*b);                      // cos(z)

    return out.assign(
        Math.asin(sx) * MyMath.RAD2DEG,
        Math.atan2(sy, cy) * MyMath.RAD2DEG,
        Math.atan2(sz, cz) * MyMath.RAD2DEG
    );
}


/** Quaternion.euler(x,y,z, RotationOrder.EulerZYX) 에서 사용된 오일러각 (x,y,-z)를 구합니다. */
export function toEulerZYX(q, out=new Vector3()) {

}