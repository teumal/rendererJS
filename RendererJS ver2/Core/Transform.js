
import {Vector3, Vector4, Matrix4x4, Quaternion, DualQuaternion, RotationOrder} from "./MyMath.js";
import { GameObject } from "./GameEngine.js";


/** Transform 은 Scaling, Rotation, Translation 변환과, 계층구조(Hierarchy)를 정의합니다. */
export class Transform {
    static #temp0 = new Quaternion();
    static #temp1 = new Matrix4x4();
    static #temp2 = new Matrix4x4();
    static #temp3 = new Matrix4x4();
    static #temp4 = new Vector3();
    static #temp5 = new Vector3();

    #localPosition = new Vector3();
    #localScale    = new Vector3(1,1,1);
    #localRotation = new Quaternion();

    #worldPosition = new Vector3();
    #worldScale    = new Vector3(1,1,1);
    #worldRotation = new Quaternion();

    #parent   = null; // Transform
    #children = [];   // Transform[]

    #TRS; // TRS() cache
    #dq;  // toDualQuaternion() cache


    /** Transform 의 이름을 나타내는 string 을 얻습니다. */
    name = "";


    ///////////////////////////
    // Private Methods       //
    ///////////////////////////


    /** (this.world = parent.world · this.local) 임을 이용해, 자신의 world transform 을 계산합니다.
     * 
     *  부모가 없다면 local transform == world transform 이 됩니다. world transform 이 수정되었으므로
     * 
     *  자신의 자식들의 world transform 또한 수정되어야 합니다. */
    #calculateWorld() {
        const parent = this.#parent;

        const s0 = this.#localScale;
        const q0 = this.#localRotation;
        const t0 = this.#localPosition;

        const s = this.#worldScale;
        const q = this.#worldRotation;
        const t = this.#worldPosition;

        this.#setDirty(); // TRS(), toDualQuaternion() 함수의 cache 는 더이상 유효하지 않게 된다.

        if(this.#parent == null) { // 부모가 없다면, local transform == world transform.
            s.assign(s0);          // s = s0
            q.assign(q0);          // q = q0
            t.assign(t0);          // t = t0
        }
        else {
            const s1 = parent.#worldScale;
            const q1 = parent.#worldRotation;
            const t1 = parent.#worldPosition;
        
            s0.mulVector(s1, s); // s = s0 * s1
            q0.mulQuat(q1, q);   // q = q1 * q0

            q1.mulVector(t0, t); // t = (q1·t0·q1*)
            t.mulVector(s1, t);  // t = (q1·t0·q1*)*s1
            t.add(t1, t);        // t = (q1·t0·q1*)*s1 + t1
        }

        this.#calculateChildrenWorld(); // 자신의 world transform 이 변경되었으므로,
                                        // 자신의 자식들의 world transform 또한 재계산해야한다.
    }


    /** (this.world = parent.world · this.local) 임을 이용해, 자신의 local transform 을 계산합니다.
     * 
     *  부모가 없다면 local transform == world transform 이 됩니다. 자신의 world transform 은 변함 없기 때문에
     * 
     *  자식들의 world transform 을 재계산할 필요는 없습니다.
     */
    #calculateLocal() {
        const parent = this.#parent;

        const s0 = this.#localScale;
        const q0 = this.#localRotation;
        const t0 = this.#localPosition;

        const s = this.#worldScale;
        const q = this.#worldRotation;
        const t = this.#worldPosition;

        if(this.#parent == null) { // 부모가 없다면, local transform == world transform
            s0.assign(s);          // s0 = s
            q0.assign(q);          // q0 = q
            t0.assign(t);          // t0 = t
            return;
        }
        else {
            const s1 = parent.#worldScale;
            const q1 = parent.#worldRotation;
            const t1 = parent.#worldPosition;

            const invq1 = q1.conjugate(Transform.#temp0); // q1* = q1^(-1)

            s.divVector(s1, s0);  // s0 = (s / s1) 
            q.mulQuat(invq1, q0); // q0 = (q1*·q)

            t.sub(t1, t0);           // t0 = (t - t1)
            t0.divVector(s1, t0);    // t0 = (t - t1) / s1
            invq1.mulVector(t0, t0); // t0 = q1* · ((t - t1) / s1) · q1
        }
    }


    /** 자식들의 world transform 을 재계산합니다. 이 함수는 자신의 world transform 이 변경되었다면 반드시 호출해야 합니다. */
    #calculateChildrenWorld() {
        const count = this.#children.length;

        for(let i=0; i<count; ++i) {
            this.#children[i].#calculateWorld();
        }
    }


    /** TRS(), toDualQuaternion() 의 cache 를 무효화시킵니다. cache 는 이후에 해당 함수를 호출할때 재계산됩니다. */
    #setDirty() { 

        if(this.#TRS) {
            this.#TRS.basisW.w = NaN;
        }
        if(this.#dq) {
            this.#dq.real.w = NaN;
        }
    }


    /** TRS() 에서 사용할 cache 를 얻습니다. 할당되지 않았다면 Matrix4x4 를 할당합니다. */
    #getTRS() {

        if(this.#TRS == undefined) {
            this.#TRS = new Matrix4x4();
            this.#setDirty();
        }
        return this.#TRS;
    }


    /** toDualQuaternion() 에서 사용할 cache 를 얻습니다. 할당되지 않았다면 DualQuaternion 을 할당합니다. */
    #getDQ() {

        if(this.#dq == undefined) {
            this.#dq = new DualQuaternion();
            this.#dq.scale = Vector3.one;
            this.#setDirty();
        }
        return this.#dq;
    }


    ///////////////////////////
    // Public Methods        //
    ///////////////////////////


    /** Transform 을 생성합니다. */
    constructor(name="Transform", scale, rotation, position) { 
        this.name = name;
        this.#setDirty(); 

        if(scale) {
            this.setWorldTransform(scale, rotation, position);
        }
    }


    /** Transform 을 나타내는 string 을 돌려줍니다. */
    toString(toEuler=false, rotationOrder=RotationOrder.EulerYXZ) {
        const name = `\n${this.name}:\n`;

        let q0 = this.#localRotation;
        let q1 = this.#worldRotation;

        if(toEuler) {
            q0 = Quaternion.toEuler(q0, rotationOrder);
            q1 = Quaternion.toEuler(q1, rotationOrder);
        }

        const localScale    = `\tlocalScale    : ${this.#localScale}\n`;
        const localRotation = `\tlocalRotation : ${q0}\n`;
        const localPosition = `\tlocalPosition : ${this.#localPosition}\n\n`;

        const worldScale    = `\tworldScale    : ${this.#worldScale}\n`;
        const worldRotation = `\tworldRotation : ${q1}\n`;
        const worldPosition = `\tworldPosition : ${this.#worldPosition}\n\n`; 

        return name + localScale + localRotation + localPosition + worldScale + worldRotation + worldPosition;
    }


    /** TRS() 의 rotation, position 를 분리시켜 만든 DualQuaternion 을 돌려줍니다. 일반적으로 DualQuaternion 은 Scaling 을 다루지 않지만,
     * 
     *  특별히 toDualQuaternion() 은 Scaling 을 나타내는 Vector3 를 할당합니다. 행렬로 변환하거나, DLB 스키닝 연산에서 직접 계산하시길 바랍니다.
     * 
     *  생성비용을 줄이기 위해 Transform 은 항상 내부적으로 cache 를 유지하며, toDualQuaternion() 은 cache 의 참조를 돌려줍니다. 
     * 
     *  toDualQuaternion() 의 결과는 읽기 전용(read-only)이며, 복사본이 필요하다면 대신 toDualQuaternion().clone(); 처럼 사용하시길 바랍니다. */
    toDualQuaternion() {
        const cache = this.#getDQ();

        if(Number.isNaN(cache.real.w)) {                                                     // cache.real.w == NaN 이라면, cache 가 무효화되었다는 의미.
            DualQuaternion.rotateTranslate(this.#worldRotation, this.#worldPosition, cache); // 한번만 cache 를 재계산하며, 이후에는 캐싱된 듀얼 사원수를 돌려준다.
            cache.scale.assign(this.#worldScale);                                            // 특별히 Scaling 을 나타내는 Vector3 가 cache.scale 에 할당된다.
        }
        return cache;
    }


    /** (transformN.TRS() · ... · transform1.TRS() · transform0.TRS()) 의 결과를 나타내는 world transform 을 out 에 담아 돌려줍니다.
     * 
     *  결과는 Transform 이며, out 의 world transform 이 수정되었으므로 out 의 local transform 이 재계산됩니다. 또한 out 의 자식들의
     * 
     *  world transform 들 또한 재계산되게 됩니다. */
    mulTransform(...transformsAndOut) {
        const length = transformsAndOut.length-1;
        const out    = transformsAndOut[length];

        const s0 = Transform.#temp4.assign(this.#worldScale);
        const q0 = Transform.#temp0.assign(this.#worldRotation);
        const t0 = Transform.#temp5.assign(this.#worldPosition);
        
        for(let i=0; i<length; ++i) {
            const transform = transformsAndOut[i];

            const s1 = transform.#worldScale;
            const q1 = transform.#worldRotation;
            const t1 = transform.#worldPosition;

            s0.mulVector(s1, s0); // s0 = s1 * s0
            q0.mulQuat(q1, q0);   // q0 = q1 · q0

            q1.mulVector(t0, t0); // t0 = (q1·t0·q1*)
            t0.mulVector(s1, t0); // t0 = (q1·t0·q1*)*s1
            t0.add(t1, t0);       // t0 = (q1·t0·q1*)*s1 + t1
        }

        out.#worldScale.assign(s0);
        out.#worldRotation.assign(q0);
        out.#worldPosition.assign(t0);

        out.#calculateLocal();
        out.#calculateChildrenWorld();
        out.#setDirty();

        return out;
    }


    /** 트랜스폼의 역(inverse)을 나타내는 Transform 을 out 에 담아 돌려줍니다. 계층구조(parent, children)는 복사되지 않습니다.
     * 
     *  기존의 TRS 의 결과가 R(p·s) + t 를 나타냈다면, 역을 취한 후의 TRS 는 R-1((p-t) / s) 를 돌려주게 됩니다. world transform 이
     * 
     *  수정되었으므로, out 의 local transform 이 재계산됩니다. 또한 out 의 자식들의 world transform 또한 재계산됩니다.
     */
    inverse(out=new Transform()) {
        const s0 = this.#worldScale;
        const q0 = this.#worldRotation;
        const t0 = this.#worldPosition;

        const s1 = out.#worldScale;
        const q1 = out.#worldRotation;
        const t1 = out.#worldPosition;

        q0.conjugate(q1);                  // q1 = q0*
        s1.assign(1/s0.x, 1/s0.y, 1/s0.z); // s1 = 1 / s0

        t0.mulVector(s1, t1); // t1 = t0 * s1
        t1.mulScalar(-1, t1); // t1 = -t0 * s0
        q1.mulVector(t1, t1); // t1 = R-1(-t0 * s0)
        
        out.#calculateLocal();
        out.#calculateChildrenWorld();
        out.#setDirty();

        return out;
    }


    /** TRS = (WorldPosition · WorldRotation · WorldScaling) 을 수행하는 Matrix4x4 를 돌려줍니다. 계산량을 줄이기 위해
     * 
     *  Transform 은 항상 내부적으로 cache 를 유지하며, TRS() 는 cache 의 참조를 돌려줍니다. TRS() 의 결과는 읽기 전용(read-only)이며,
     * 
     *  복사본이 필요하다면 대신 TRS().clone(); 처럼 사용하시길 바랍니다. */
    TRS() {
        const cache = this.#getTRS();

        if(Number.isNaN(cache.basisW.w)) { // cache.basisW.w == NaN 이라면, cache 가 무효화되었다는 의미.
            const s = this.#worldScale;    // 한번만 cache 를 재계산하며, 이후에는 캐싱된 행렬을 돌려준다.
            const q = this.#worldRotation;
            const t = this.#worldPosition;

            q.toMatrix4x4(cache); // cache.basisW.w 는 여기서 1 로 설정된다.

            cache.basisX.x *= s.x;
            cache.basisY.x *= s.y;
            cache.basisZ.x *= s.z;

            cache.basisX.y *= s.x;
            cache.basisY.y *= s.y;
            cache.basisZ.y *= s.z;

            cache.basisX.z *= s.x;
            cache.basisY.z *= s.y;
            cache.basisZ.z *= s.z;

            cache.basisW.x = t.x;
            cache.basisW.y = t.y;
            cache.basisW.z = t.z;
        }
        return cache;
    }


    /** TRS-1 = (WorldScaling-1· WorldRotation-1 · WorldPosition-1) 을 수행하는 Matrix4x4 를 out 에 담아 돌려줍니다.
     * 
     *  빈번히 사용되는 TRS() 와 다르게, invTRS() 는 Camera.view() 정도에서만 사용되므로 특별히 cache 를 유지하지 않습니다. */
    invTRS(out=new Matrix4x4()) {
        const s    = this.#worldScale;
        const invq = this.#worldRotation.conjugate(Transform.#temp0); // q*
        const t    = this.#worldPosition;

        const invS = Transform.#temp1;                   // 비례 행렬 S 의 역행렬 S^(-1)
        const invR = invq.toMatrix4x4(Transform.#temp2); // 회전 행렬 R 의 역행렬 R^(-1)
        const invT = Transform.#temp3;                   // 이동 행렬 T 의 역행렬 T^(-1)

        invS.basisX.x = 1/s.x;
        invS.basisY.y = 1/s.y;
        invS.basisZ.z = 1/s.z;

        invT.basisW.x = -t.x;
        invT.basisW.y = -t.y;
        invT.basisW.z = -t.z;

        return invT.mulMat(invR, invS, out); // out = (invS · invR · invT)
    }


    /** 자식 Transform 을 추가합니다. */
    addChild(newChild) {
        const index = this.#children.indexOf(newChild);

        if(index == -1) {           // newChild 가 중복되지 않는다면, 자신의 자식으로 추가한다.
            newChild.parent = this; // parent getter 에서 newChild 의 local transform 을 재계산한다.
        }
    }


    /** 자식 Transform 을 제거합니다. target 이 존재하지 않는다면, 아무 일도 일어나지 않습니다. */
    removeChild(target) {

        if(target.parent == this) { // newChild 가 정말로 자신의 자식이 맞다면, 자신의 자식에서 제거한다.
            target.parent = null;   // parent getter 에서 newChild 의 local transform 을 재계산한다.
        }
    }


    /** index 번째의 자식 Transform 을 얻습니다. */
    getChild(index) { return this.#children[index]; }


    /** local transform 을 설정합니다. local transform 이 수정되었으니, 자신의 world transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. 비례,회전,이동을 한꺼번에 수정해야 한다면, localScale, localRotation,
     * 
     *  localPosition 을 따로 호출하는 것보다 setLocalTransform 을 한번 호출하는 것이 더 빠릅니다.
     */
    setLocalTransform(newScale, newRotation, newPosition) {

        if(newRotation == undefined) {

            // i) setLocalTransform(transform)
            if(newScale instanceof Transform) {
                const transform = newScale;

                newScale    = transform.#localScale;
                newRotation = transform.#localRotation;
                newPosition = transform.#localPosition;
            }

            // ii) setLocalTransform(TRS)
            else if(newScale instanceof Matrix4x4) { // Matrix4x4 는 항상 TRS 만 취급하며, invTRS 의 형태일 경우
                const TRS = newScale.clone();        // 올바른 결과를 얻을 수 없습니다.

                newScale = new Vector3(               // TR 행렬에서 표준기저벡터들은 항상 크기가 1이다.
                    TRS.basisX.toVector3().magnitude, // Scaling 이 있는 경우에만 표준기저벡터의 크기가 1이 아니게 되므로
                    TRS.basisY.toVector3().magnitude, // 표준기저벡터의 크기가 Scaling 성분이 된다.
                    TRS.basisZ.toVector3().magnitude
                );
                newPosition = TRS.basisW.toVector3(); // basisW 는 이동벡터를 담고 있기에, Translation 성분이 된다.

                TRS.basisX.mulScalar(1/newScale.x); // TRS 에서 Scaling 성분을 제거해서 TR 행렬로 만들어준다.
                TRS.basisY.mulScalar(1/newScale.y); // 단순히 기저벡터들을 Scaling 값으로 나누어주면 된다.
                TRS.basisZ.mulScalar(1/newScale.z);

                newRotation = TRS.toQuaternion(); // TRS 를 3x3 행렬로 취급하고, Quaternion 으로 변환한다.
            }
        }
        
        this.#localScale.assign(newScale);
        this.#localRotation.assign(newRotation);
        this.#localPosition.assign(newPosition);

        this.#calculateWorld();
    }


    /** world transform 을 설정합니다. world transform 이 수정되었으니, 자신의 local transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. 비례,회전,이동을 한꺼번에 수정해야 한다면, scale, rotation,
     * 
     *  position 을 따로 호출하는 것보다 setWorldTransform 을 한번 호출하는 것이 더 빠릅니다.
     */
    setWorldTransform(newScale, newRotation, newPosition) {

        if(newRotation == undefined) {

            // i) setWorldTransform(transform)
            if(newScale instanceof Transform) {
                const transform = newScale;

                newScale    = transform.#worldScale;
                newRotation = transform.#worldRotation;
                newPosition = transform.#worldPosition;
            }

            // ii) setWorldTransform(TRS)
            else if(newScale instanceof Matrix4x4) { // Matrix4x4 는 항상 TRS 만 취급하며, invTRS 의 형태일 경우
                const TRS = newScale.clone();        // 올바른 결과를 얻을 수 없습니다.

                newScale = new Vector3(               // TR 행렬에서 표준기저벡터들은 항상 크기가 1이다.
                    TRS.basisX.toVector3().magnitude, // Scaling 이 있는 경우에만 표준기저벡터의 크기가 1이 아니게 되므로
                    TRS.basisY.toVector3().magnitude, // 표준기저벡터의 크기가 Scaling 성분이 된다.
                    TRS.basisZ.toVector3().magnitude
                );
                newPosition = TRS.basisW.toVector3(); // basisW 는 이동벡터를 담고 있기에, Translation 성분이 된다.

                TRS.basisX.mulScalar(1/newScale.x); // TRS 에서 Scaling 성분을 제거해서 TR 행렬로 만들어준다.
                TRS.basisY.mulScalar(1/newScale.y); // 단순히 기저벡터들을 Scaling 값으로 나누어주면 된다.
                TRS.basisZ.mulScalar(1/newScale.z);

                newRotation = TRS.toQuaternion(); // TRS 를 3x3 행렬로 취급하고, Quaternion 으로 변환한다.
            }
        }
        this.#worldScale.assign(newScale);
        this.#worldRotation.assign(newRotation);
        this.#worldPosition.assign(newPosition);

        this.#calculateLocal();
        this.#calculateChildrenWorld();
        this.#setDirty();
    }


    /** 부모 Transform 을 얻습니다. 부모가 없다면 null 을 돌려줍니다. 부모가 변경되었다고
     * 
     *  자신의 world transform 이 수정되지는 않습니다. 대신 parent space 에 들어왔으므로
     * 
     *  자신의 local transform 이 재계산됩니다. */
    get parent() { return this.#parent; }
    set parent(newParent=null) {
        const oldParent = this.#parent;
        
        if(newParent == this.#parent) { // newParent 와 이미 부모-자식 관계라면
            return;                     // 바로 함수를 종료한다.
        }
        if(newParent == this) { // 자기자신이 자신의 부모가 될 수는 없으므로
            return;             // 바로 함수를 종료한다.
        }

        if(this.#parent != null) {                           // 다른 부모가 존재한다면, 기존의 부모는
            const index = oldParent.#children.indexOf(this); // 자식 목록에서 this 를 제거한다.
            oldParent.#children.splice(index, 1);
        }
        this.#parent = newParent; // 새로운 부모를 등록한다.

        if(newParent != null) {                // 새로운 부모는 자식 목록에
            this.#parent.#children.push(this); // this 를 추가한다.
        }

        this.#calculateLocal(); // 자신의 local transform 을 재계산한다.
    }


    /** 자식 Transform 의 갯수를 얻습니다. 결과는 number 입니다. */
    get childCount() { return this.#children.length; }


    /** world scale 을 나타내는 Vector3 를 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다.
     * 
     *  world scale 을 설정하는 경우, world transform 이 수정되었으니, local transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get scale() { return this.#worldScale.clone(); }
    set scale(newScale) {
        this.#worldScale.assign(newScale);
        this.#calculateLocal();
        this.#calculateChildrenWorld();
        this.#setDirty();
        return newScale;
    }


    /** world rotation 을 나타내는 Quaternion 을 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다.
     * 
     *  world rotation 을 설정하는 경우, world transform 이 수정되었으니, local transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get rotation() { return this.#worldRotation.clone(); }
    set rotation(newQuat) {
        this.#worldRotation.assign(newQuat);
        this.#calculateLocal();
        this.#calculateChildrenWorld();
        this.#setDirty();
        return newQuat;
    }


    /** world position 을 나타내는 Vector3 를 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다. 
     * 
     *  world position 을 설정하는 경우 world transform 이 수정되었으니, local transform 이 재계산됩니다. 
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get position() { return this.#worldPosition.clone(); }
    set position(newPosition) {
        this.#worldPosition.assign(newPosition);
        this.#calculateLocal();
        this.#calculateChildrenWorld();
        this.#setDirty();
        return newPosition;
    }


    /** local scale 을 나타내는 Vector3 를 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다.
     * 
     *  local scale 을 설정하는 경우 local transform 이 수정되었으니, 자신의 world transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get localScale() { return this.#localScale.clone(); }
    set localScale(newScale) { 
        this.#localScale.assign(newScale);
        this.#calculateWorld();
        return newScale;
    }


    /** local rotation 을 나타내는 Quaternion 을 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다.
     * 
     *  local rotation 을 설정하는 경우 local transform 이 수정되었으니, 자신의 world transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get localRotation() { return this.#localRotation.clone(); }
    set localRotation(newQuat) { 
        this.#localRotation.assign(newQuat);
        this.#calculateWorld();
        return newQuat;
    }


    /** local position 을 나타내는 Vector3 를 얻습니다. 항상 복사본을 돌려줌에 유의하시길 바랍니다.
     * 
     *  local position 을 설정하는 경우 local transform 이 수정되었으니, 자신의 world transform 이 재계산됩니다.
     * 
     *  또한 자식들의 world transform 도 재계산됩니다. */
    get localPosition() { return this.#localPosition.clone(); }
    set localPosition(newPosition) {
        this.#localPosition.assign(newPosition);
        this.#calculateWorld();
        return newPosition;
    }


    /** Transform 의 계층구조를 나타내는 string 을 얻습니다. */
    get hierarchy() {
        let tab0 = "";
        let tab1 = "";
        let ret  = `"${this.name}"\n`;

        const dfs = (transform) => {
            tab0 += "  |    ";

            for(let i=0; i<transform.#children.length; ++i) {
                const child = transform.#children[i];

                ret += tab0 + "\n";
                ret += tab1 + `  |____"${child.name}"\n`;
                tab1 += "  |    ";

                dfs(child);
                tab1 = tab1.slice(0, tab1.length-7);
            }
            tab0 = tab0.slice(0, tab0.length-7);
        };

        dfs(this);
        return ret;
    }
};