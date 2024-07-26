
export const deg2rad = Math.PI / 180;
export const rad2deg = 180 / Math.PI;
export const twoPI   = Math.PI * 2;

export const Bound = {
   Outside   : 0,
   Inside    : 1,
   Intersect : 2,
};


// `value` 를 [min, max] 범위로 보간합니다.
export function clamp(value, min, max) {
    if(value < min) return min;
    if(value > max) return max;
    return value;
}

// `lhs` 가 `rhs` 와 오차범위 안에서 같은지 계산합니다.
export function equalInTolerance(lhs, rhs) {
    if(rhs-Number.EPSILON <= lhs && lhs <= rhs+Number.EPSILON) {
        return true;
    }
    return false;
}


export class Vector2 {
    x; y;
   
    // 두 벡터들의 내적(dot product)의 결과를 돌려줍니다.
    static dot(u, v) { return (u.x * v.x) + (u.y * v.y); }

    // 자주 쓰는 벡터들의 축약형
    static get zero() { return new Vector2(0,0); }
    static get one()  { return new Vector2(1,1); }
    static get left() { return new Vector2(-1,0); }
    static get right() { return new Vector2(1,0); }
    static get up()    { return new Vector2(0,1); }
    static get down()  { return new Vector2(0,-1); }


    // (x, y) 인 벡터를 생성합니다. 인자를 주지 않을 경우, 각 원소들은 0 으로 초기화 됩니다.
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }


    // 벡터를 나타내는 문자열을 돌려줍니다.
    toString() { return `(${this.x}, ${this.y})`; }


    // 3차원 벡터로 변환합니다. 매개변수 `z` 는 3번째 성분을 의미하며,
    // 기본값은 1 입니다.
    toVector3(z=1) { return new Vector3(this.x, this.y, z); }


    // 4차원 벡터로 변환합니다.
    toVector4() { return new Vector4(this.x, this.y, 0, 1); }


    // 해당 벡터의 복사본을 돌려줍니다.
    clone() { return new Vector2(this.x, this.y); }


    // 벡터의 합의 결과를 돌려줍니다.
    add(...args) { 
        const ret = this.clone();

        for(const arg of args) {
            ret.x += arg.x;
            ret.y += arg.y;
        }
        return ret;
    }


    // 벡터의 뺄셈의 결과를 돌려줍니다.
    sub(...args) { 
        const ret = this.clone();

        for(const arg of args) {
            ret.x -= arg.x;
            ret.y -= arg.y;
        }
        return ret;
    }


    // 스칼라곱의 결과를 돌려줍니다.
    mul(scalar) { 
        return new Vector2(
            this.x * scalar, 
            this.y * scalar
        ); 
    }


    // 이 벡터를 정규화시킵니다.
    normalize() {
       const size = 1 / this.magnitude;
       this.x *= size;
       this.y *= size;
    }


    // 벡터의 크기의 제곱을 돌려줍니다.
    get sqrMagnitude() { return Vector2.dot(this, this); }


    // 벡터의 크기를 돌려줍니다.
    get magnitude() { return Math.sqrt(this.sqrMagnitude); }


    // 정규화된 벡터를 돌려줍니다.
    get normalized() { 
       const size = 1 / this.magnitude;
       return this.mul(size);
    }


    /*******************
     * for optimizing
     ******************/

    // 이 벡터의 성분을 x,y 로 세팅합니다.
    assign(x,y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // 이 벡터의 성분을 v 의 성분들로 세팅합니다.
    assignVector(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }


    // add() 함수와 같되, out 으로 결과를 출력합니다.
    addNonAlloc(out, ...args) {
        out.assignVector(this);

        for(const arg of args) {
            out.x += arg.x;
            out.y += arg.y;
        }
        return out;
    }


    // sub() 함수와 같되, out 으로 결과를 출력합니다.
    subNonAlloc(out, ...args) {
        out.assignVector(this);

        for(const arg of args) {
            out.x -= arg.x;
            out.y -= arg.y;
        }
        return out;
    }


    // mul() 함수와 같되, out 으로 결과를 출력합니다.
    mulNonAlloc(out, scalar) {
        return out.assign(
            this.x * scalar,
            this.y * scalar
        );
    }
};

export class Matrix2x2 {
   basisX; basisY;

   // 단위 행렬의 축약형
   static get identity() { return new Matrix2x2(); }


   // x 축, y 축 기저를 가지는 행렬을 생성합니다.
   // 인자로 준 기저는 참조 대신 복사됩니다.
   constructor(basisX=Vector2.right, basisY=Vector2.up) {
      this.basisX = basisX.clone();
      this.basisY = basisY.clone();
   }

   // 해당 행렬의 복사본을 돌려줍니다.
   clone() { return new Matrix2x2(this.basisX, this.basisY); }


   // 해당 행렬을 나타내는 문자열을 돌려줍니다.
   toString() {
      let   ret = "";
      const m00 = this.basisX.x.toString(), m01 = this.basisY.x.toString();
      const m10 = this.basisX.y.toString(), m11 = this.basisY.y.toString();

      const maxLen0 = Math.max(m00.length, m10.length);
      const maxLen1 = Math.max(m01.length, m11.length);

      // 0 행
      const space00 = " ".repeat(maxLen0 - m00.length);
      const space01 = " ".repeat(maxLen1 - m01.length);
      ret += `\n[${m00}${space00} ${space01}${m01}]`;


      // 1 행
      const space10 = " ".repeat(maxLen0 - m10.length);
      const space11 = " ".repeat(maxLen1 - m11.length);
      ret += `\n[${m10}${space10} ${m11}${space11}]`;

      return ret;
   }


   // 해당 행렬을 전치한 결과를 돌려줍니다.
   transpose() {

       return new Matrix2x2(
          new Vector2(this.basisX.x, this.basisY.x),
          new Vector2(this.basisX.y, this.basisY.y)
       );
   }


   // 행렬과 스칼라의 곱의 결과를 돌려줍니다.
   mulScalar(scalar) {
       return new Matrix2x2(
          this.basisX.mul(scalar),
          this.basisY.mul(scalar)
       );
   }


   // 행렬과 벡터의 곱의 결과를 돌려줍니다.
   mulVector(v) {
       const r0 = new Vector2(this.basisX.x, this.basisY.x);
       const r1 = new Vector2(this.basisX.y, this.basisY.y);

       return new Vector2(
          Vector2.dot(r0, v),
          Vector2.dot(r1, v)
       );
   }


   // 행렬과 행렬의 곱의 결과를 돌려줍니다.
   mulMat(...mats) {
      let ret = this.clone();

      for(const mat of mats) {
        const matT = mat.transpose();
       
        const basisX = new Vector2(
            Vector2.dot(matT.basisX, ret.basisX),
            Vector2.dot(matT.basisY, ret.basisX)
        );
        const basisY = new Vector2(
            Vector2.dot(matT.basisX, ret.basisY),
            Vector2.dot(matT.basisY, ret.basisY)
        );
        ret = new Matrix2x2(basisX, basisY);
      }
      return ret;
   }
};



export class Vector3 {
   x; y; z;

   // 두 벡터들의 내적(dot product)의 결과를 돌려줍니다.
   static dot(u, v) { return (u.x * v.x) + (u.y * v.y) + (u.z * v.z); }

   // 두 벡터들의 외적(cross product)의 결과를 돌려줍니다.
   static cross(u,v) { 
      return new Vector3(
         u.y*v.z - u.z*v.y,
         u.z*v.x - u.x*v.z,
         u.x*v.y - u.y*v.x
      );
   }

   static get zero() { return new Vector3(0,0,0); }
   static get one()  { return new Vector3(1,1,1); }
   static get left() { return new Vector3(-1,0,0); }
   static get right() { return new Vector3(1,0,0); }
   static get up() { return new Vector3(0,1,0); }
   static get down() { return new Vector3(0,-1,0); }
   static get forward() { return new Vector3(0,0,1); }
   static get back() { return new Vector3(0,0,-1); }



   // (x,y,z) 인 벡터를 생성합니다. 인자를 주지 않을 경우, 각 성분들은 0 으로 초기화됩니다.
   constructor(x=0, y=0, z=0) {
       this.x = x;
       this.y = y;
       this.z = z;
   }


   // 벡터를 나타내는 문자열을 돌려줍니다.
   toString() { return `(${this.x}, ${this.y}, ${this.z})`; }


   // 2차원 벡터로 변환합니다.
   toVector2() { return new Vector2(this.x, this.y); }

   // 4차원 벡터로 변환합니다. 매개변수 `w` 는 4번째 성분을 의미하며,
   // 기본값은 1입니다.
   toVector4(w=1) { return new Vector4(this.x, this.y, this.z, w); }

   // 해당 벡터의 복사본을 돌려줍니다.
   clone() { return new Vector3(this.x, this.y, this.z); }


   // 벡터의 합의 결과를 돌려줍니다.
   add(...args) {
      const ret = this.clone();

      for(const arg of args) {
          ret.x += arg.x;
          ret.y += arg.y;
          ret.z += arg.z;
      }
      return ret;
   }


   // 벡터의 뺄셈의 결과를 돌려줍니다.
   sub(...args) {
       const ret = this.clone();

       for(const arg of args) {
          ret.x -= arg.x;
          ret.y -= arg.y;
          ret.z -= arg.z;
       }
       return ret;
   }


   // 스칼라곱의 결과를 돌려줍니다.
   mul(scalar) {
       return new Vector3(
           this.x * scalar,
           this.y * scalar,
           this.z * scalar
       );
   }

   // 벡터들의 각 성분끼리 곱한 결과를 돌려줍니다.
   mulVector(v) {
       return new Vector3(
           this.x * v.x,
           this.y * v.y,
           this.z * v.z
       );
   }


   // 이 벡터를 정규화시킵니다.
   normalize() {
      const size = 1 / this.magnitude;
      this.x *= size;
      this.y *= size;
      this.z *= size;
   }


   // 벡터의 크기의 제곱을 돌려줍니다.
   get sqrMagnitude() { return Vector3.dot(this,this); }


   // 벡터의 크기를 돌려줍니다.
   get magnitude() { return Math.sqrt(this.sqrMagnitude); }


   // 정규화된 벡터를 돌려줍니다.
   get normalized() {
      const size = 1 / this.magnitude;
      return this.mul(size);
   }


    /*******************
     * for optimizing
     ******************/

    // cross() 와 같되, 결과를 out 에 담습니다.
    static crossNonAlloc(out, u,v) {

        return out.assign(
            u.y*v.z - u.z*v.y,
            u.z*v.x - u.x*v.z,
            u.x*v.y - u.y*v.x
         );
    }

    // 이 벡터의 각 성분들을 x,y,z 로 세팅합니다.
    assign(x,y,z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    // 이 벡터의 각 성분들을 v 의 성분들로 세팅합니다.
    assignVector(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }


    // add() 와 같되, 결과를 out 에 담습니다.
    addNonAlloc(out, ...args) {
        out.assignVector(this);

        for(const arg of args) {
            out.x += arg.x;
            out.y += arg.y;
            out.z += arg.z;
        }
        return out;
    }


    // sub() 와 같되, 결과를 out 에 담습니다.
    subNonAlloc(out, ...args) {
        out.assignVector(this);

        for(const arg of args) {
            out.x -= arg.x;
            out.y -= arg.y;
            out.z -= arg.z;
        }
        return out;
    }


    // mul() 과 같되, 결과를 out 에 담습니다.
    mulNonAlloc(out, scalar) {
        return out.assign(
            this.x * scalar,
            this.y * scalar,
            this.z * scalar
        );
    }


    // mulVector() 와 같되, 결과를 out 에 담습니다.
    mulVectorNonAlloc(out, v) {
        return out.assign(
            this.x * v.x,
            this.y * v.y,
            this.z * v.z
        );
    }
};

export class Matrix3x3 {
    basisX; basisY; basisZ;


    // 단위행렬의 축약형
    static get identity() { return new Matrix3x3(); }


    // x, y, z 축 기저를 가지는 행렬을 생성합니다.
    // 인자로 준 기저는 참조 대신 복사됩니다.
    constructor(basisX = Vector3.right, 
                basisY = Vector3.up, 
                basisZ = Vector3.forward)
    {
        this.basisX = basisX.clone();
        this.basisY = basisY.clone();
        this.basisZ = basisZ.clone();
    }


    // 해당 행렬의 복사본을 돌려줍니다.
    clone() { return new Matrix3x3(this.basisX, this.basisY, this.basisZ); }


    // 해당 행렬을 나타내는 문자열을 돌려줍니다.
    toString() {
        let ret = "";
        const m00 = `${this.basisX.x}`, m01 = `${this.basisY.x}`, m02 = `${this.basisZ.x}`;
        const m10 = `${this.basisX.y}`, m11 = `${this.basisY.y}`, m12 = `${this.basisZ.y}`;
        const m20 = `${this.basisX.z}`, m21 = `${this.basisY.z}`, m22 = `${this.basisZ.z}`;

        const maxLen0 = Math.max(m00.length, m10.length, m20.length);
        const maxLen1 = Math.max(m01.length, m11.length, m21.length);
        const maxLen2 = Math.max(m02.length, m12.length, m22.length);

        // 0 행
        const space00 = " ".repeat(maxLen0 - m00.length);
        const space01 = " ".repeat(maxLen1 - m01.length);
        const space02 = " ".repeat(maxLen2 - m02.length);
        ret += `\n[${m00}${space00} ${space01}${m01} ${space02}${m02}]`;


        // 1 행
        const space10 = " ".repeat(maxLen0 - m10.length);
        const space11 = " ".repeat(maxLen1 - m11.length);
        const space12 = " ".repeat(maxLen2 - m12.length);
        ret += `\n[${m10}${space10} ${space11}${m11} ${space12}${m12}]`;


        // 2 행
        const space20 = " ".repeat(maxLen0 - m20.length);
        const space21 = " ".repeat(maxLen1 - m21.length);
        const space22 = " ".repeat(maxLen2 - m22.length);
        ret += `\n[${m20}${space20} ${space21}${m21} ${space22}${m22}]`;

        return ret;
    }


    // 해당 행렬을 전치한 결과를 돌려줍니다.
    transpose() {

        return new Matrix3x3(
            new Vector3(this.basisX.x, this.basisY.x, this.basisZ.x),
            new Vector3(this.basisX.y, this.basisY.y, this.basisZ.y),
            new Vector3(this.basisX.z, this.basisY.z, this.basisZ.z)
        );
    }


    // 행렬과 스칼라의 곱의 결과를 돌려줍니다.
    mulScalar(scalar) {
        return new Matrix3x3(
            this.basisX.mul(scalar),
            this.basisY.mul(scalar),
            this.basisZ.mul(scalar)
        );
    }


    // 행렬과 벡터의 곱의 결과를 돌려줍니다.
    mulVector(v) {
        const matT = this.transpose();

        return new Vector3(
            Vector3.dot(matT.basisX, v),
            Vector3.dot(matT.basisY, v),
            Vector3.dot(matT.basisZ, v)
        );
    }


    // 행렬과 행렬의 곱의 결과를 돌려줍니다.
    mulMat(...mats) {
        let ret = this.clone();

        for(const mat of mats) {
            const matT = mat.transpose();

            const basisX = new Vector3(
                Vector3.dot(matT.basisX, ret.basisX),
                Vector3.dot(matT.basisY, ret.basisX),
                Vector3.dot(matT.basisZ, ret.basisX)
            );
            const basisY = new Vector3(
                Vector3.dot(matT.basisX, ret.basisY),
                Vector3.dot(matT.basisY, ret.basisY),
                Vector3.dot(matT.basisZ, ret.basisY)
            );
            const basisZ = new Vector3(
                Vector3.dot(matT.basisX, ret.basisZ),
                Vector3.dot(matT.basisY, ret.basisZ),
                Vector3.dot(matT.basisZ, ret.basisZ)
            );
            ret = new Matrix3x3(basisX, basisY, basisZ);
        }
        return ret;
    }
};



export class Vector4 {
   x; y; z; w;

   // 두 벡터들의 내적(dot product)의 결과를 돌려줍니다.
   static dot(u,v) { return (u.x * v.x) + (u.y * v.y) + (u.z * v.z) + (u.w * v.w); }

   // new Vecotr4() 의 축약형입니다.
   static get zero() { return new Vector4(0,0,0,0); }

   // (x,y,z,w) 인 벡터를 생성합니다.
   constructor(x=0, y=0, z=0, w=0) {
       this.x = x;
       this.y = y;
       this.z = z;
       this.w = w;
   }


   // 벡터를 나타내는 문자열을 돌려줍니다.
   toString() { return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`; }


   // 2차원 벡터로 변환합니다.
   toVector2() { return new Vector2(this.x, this.y); }


   // 3차원 벡터로 변환합니다.
   toVector3() { return new Vector3(this.x, this.y, this.z); }


   // 해당 벡터의 복사본을 돌려줍니다.
   clone() { return new Vector4(this.x, this.y, this.z, this.w); }


   // 벡터의 합의 결과를 돌려줍니다.
   add(...args) {
      const ret = this.clone();

      for(const arg of args) {
          ret.x += arg.x;
          ret.y += arg.y;
          ret.z += arg.z;
          ret.w += arg.w;
      }
      return ret;
   }


   // 벡터의 뺼셈의 결과를 돌려줍니다.
   sub(...args) {
      const ret = this.clone();

      for(const arg of args) {
          ret.x -= arg.x;
          ret.y -= arg.y;
          ret.z -= arg.z;
          ret.w -= arg.w;
      }
      return ret;
   }


   // 스칼라곱의 결과를 돌려줍니다.
   mul(scalar) {
      return new Vector4(
          this.x * scalar,
          this.y * scalar,
          this.z * scalar,
          this.w * scalar
      );
   }

   // 벡터와 벡터끼리 곱한 결과를 돌려줍니다.
   mulVector(v) {
       return new Vector4(
           this.x * v.x,
           this.y * v.y,
           this.z * v.z,
           this.w * v.w
       );
   }


   /*****************
    * for optimizing
    *****************/

   // 이 벡터의 각 성분들을 x,y,z,w 로 세팅합니다.
   assign(x,y,z,w) {
       this.x = x;
       this.y = y;
       this.z = z;
       this.w = w;
       return this;
   }


   // 이 벡터의 각 성분들을 v 의 성분들로 세팅합니다.
   assignVector(v) {
       this.x = v.x;
       this.y = v.y;
       this.z = v.z;
       this.w = v.w;
       return this;
   }


   // add() 와 같되, 결과를 out 에 담습니다.
   addNonAlloc(out, ...args) {
       out.assignVector(this);

       for(const arg of args) {
           out.x += arg.x;
           out.y += arg.y;
           out.z += arg.z;
           out.w += arg.w;
       }
       return out;
   }

   // sub() 와 같되, 결과를 out 에 담습니다.
   subNonAlloc(out, ...args) {
        out.assignVector(this);

        for(const arg of args) {
            out.x -= arg.x;
            out.y -= arg.y;
            out.z -= arg.z;
            out.w -= arg.w;
        }
        return out;
   }


   // mul() 과 같되, 결과를 out 에 담습니다.
   mulNonAlloc(out, scalar) {
       return out.assign(
           this.x * scalar,
           this.y * scalar,
           this.z * scalar,
           this.w * scalar
       );
   }


   // 벡터와 벡터끼리 곱한 결과를 돌려줍니다.
   mulVectorNonAlloc(out, v) {
       return out.assign(
           this.x * v.x,
           this.y * v.y,
           this.z * v.z,
           this.w * v.w
       );
   }
};

export class Matrix4x4 {
   basisX; basisY; basisZ; basisW;

   // 단위행렬의 축약형
   static get identity() { return new Matrix4x4(); }


   // x, y, z, w 축 기저를 가지는 행렬을 생성합니다.
   // 인자로 준 기저는 참조 대신 복사됩니다.
   constructor(basisX = new Vector4(1,0,0,0),
               basisY = new Vector4(0,1,0,0),
               basisZ = new Vector4(0,0,1,0),
               basisW = new Vector4(0,0,0,1)) 
   {
       this.basisX = basisX.clone();
       this.basisY = basisY.clone();
       this.basisZ = basisZ.clone();
       this.basisW = basisW.clone();
   }


   // 해당 행렬의 복사본을 돌려줍니다.
   clone() { 
       return new Matrix4x4(
           this.basisX, this.basisY, this.basisZ, this.basisW
       ); 
   }


   // 해당 행렬을 나타내는 문자열을 돌려줍니다.
   toString() {
       let ret = "";
       const m00 = `${this.basisX.x}`, m01 = `${this.basisY.x}`, m02 = `${this.basisZ.x}`, m03 = `${this.basisW.x}`;
       const m10 = `${this.basisX.y}`, m11 = `${this.basisY.y}`, m12 = `${this.basisZ.y}`, m13 = `${this.basisW.y}`;
       const m20 = `${this.basisX.z}`, m21 = `${this.basisY.z}`, m22 = `${this.basisZ.z}`, m23 = `${this.basisW.z}`;
       const m30 = `${this.basisX.w}`, m31 = `${this.basisY.w}`, m32 = `${this.basisZ.w}`, m33 = `${this.basisW.w}`;

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


   // 해당 행렬을 전치한 결과를 돌려줍니다.
   transpose() {
       
       return new Matrix4x4(
           new Vector4(this.basisX.x, this.basisY.x, this.basisZ.x, this.basisW.x),
           new Vector4(this.basisX.y, this.basisY.y, this.basisZ.y, this.basisW.y),
           new Vector4(this.basisX.z, this.basisY.z, this.basisZ.z, this.basisW.z),
           new Vector4(this.basisX.w, this.basisY.w, this.basisZ.w, this.basisW.w)
       );
   }


   // 행렬과 스칼라의 곱의 결과를 돌려줍니다.
   mulScalar(scalar) {
       return new Matrix4x4(
           this.basisX.mul(scalar),
           this.basisY.mul(scalar),
           this.basisZ.mul(scalar),
           this.basisW.mul(scalar)
       );
   }


   // 행렬과 벡터의 곱의 결과를 돌려줍니다.
   mulVector(v) {
       const matT = this.transpose();

       return new Vector4(
           Vector4.dot(matT.basisX, v),
           Vector4.dot(matT.basisY, v),
           Vector4.dot(matT.basisZ, v),
           Vector4.dot(matT.basisW, v)
       );
   }


   // 행렬과 행렬의 곱의 결과를 돌려줍니다.
   mulMat(...mats) {
       let ret = this.clone();

       for(const mat of mats) {
           const matT = mat.transpose();

            const basisX = new Vector4(
               Vector4.dot(matT.basisX, ret.basisX),
               Vector4.dot(matT.basisY, ret.basisX),
               Vector4.dot(matT.basisZ, ret.basisX),
               Vector4.dot(matT.basisW, ret.basisX)
            );
            const basisY = new Vector4(
               Vector4.dot(matT.basisX, ret.basisY),
               Vector4.dot(matT.basisY, ret.basisY),
               Vector4.dot(matT.basisZ, ret.basisY),
               Vector4.dot(matT.basisW, ret.basisY)
            );
            const basisZ = new Vector4(
                Vector4.dot(matT.basisX, ret.basisZ),
                Vector4.dot(matT.basisY, ret.basisZ),
                Vector4.dot(matT.basisZ, ret.basisZ),
                Vector4.dot(matT.basisW, ret.basisZ)
            );
            const basisW = new Vector4(
                Vector4.dot(matT.basisX, ret.basisW),
                Vector4.dot(matT.basisY, ret.basisW),
                Vector4.dot(matT.basisZ, ret.basisW),
                Vector4.dot(matT.basisW, ret.basisW)
            );
            ret = new Matrix4x4(basisX, basisY, basisZ, basisW);
       }
       return ret;
   }


   // 행렬과 행렬끼리의 덧셈의 결과를 돌려줍니다.
   addMat(...mats) {
        let ret = this.clone();

        for(const mat of mats) {
            ret.basisX = ret.basisX.add(mat.basisX);
            ret.basisY = ret.basisY.add(mat.basisY);
            ret.basisZ = ret.basisZ.add(mat.basisZ);
            ret.basisW = ret.basisW.add(mat.basisW);
        }
        return ret;
   }


   // 행렬식을 돌려줍니다.
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

   // 역행렬을 돌려줍니다. 가역행렬이 아니라면, null 을 돌려줍니다.
   inverse() {
       const det = this.det();

       if(equalInTolerance(det,0) ) {
           return null;
       }
       const invDet = 1 / det;

       const m = new Array(
          this.basisX.x, this.basisY.x, this.basisZ.x, this.basisW.x,
          this.basisX.y, this.basisY.y, this.basisZ.y, this.basisW.y,
          this.basisX.z, this.basisY.z, this.basisZ.z, this.basisW.z,
          this.basisX.w, this.basisY.w, this.basisZ.w, this.basisW.w,
       );
       const inv = new Array(16);

       //#region MainCalculation
       inv[0] = m[5]  * m[10] * m[15] - 
                m[5]  * m[11] * m[14] - 
                m[9]  * m[6]  * m[15] + 
                m[9]  * m[7]  * m[14] +
                m[13] * m[6]  * m[11] - 
                m[13] * m[7]  * m[10];

        inv[4] = -m[4]  * m[10] * m[15] + 
                  m[4]  * m[11] * m[14] + 
                  m[8]  * m[6]  * m[15] - 
                  m[8]  * m[7]  * m[14] - 
                  m[12] * m[6]  * m[11] + 
                  m[12] * m[7]  * m[10];

        inv[8] = m[4]  * m[9] * m[15] - 
                 m[4]  * m[11] * m[13] - 
                 m[8]  * m[5] * m[15] + 
                 m[8]  * m[7] * m[13] + 
                 m[12] * m[5] * m[11] - 
                 m[12] * m[7] * m[9];

        inv[12] = -m[4]  * m[9] * m[14] + 
                   m[4]  * m[10] * m[13] +
                   m[8]  * m[5] * m[14] - 
                   m[8]  * m[6] * m[13] - 
                   m[12] * m[5] * m[10] + 
                   m[12] * m[6] * m[9];

        inv[1] = -m[1]  * m[10] * m[15] + 
                  m[1]  * m[11] * m[14] + 
                  m[9]  * m[2] * m[15] - 
                  m[9]  * m[3] * m[14] - 
                  m[13] * m[2] * m[11] + 
                  m[13] * m[3] * m[10];

        inv[5] = m[0]  * m[10] * m[15] - 
                 m[0]  * m[11] * m[14] - 
                 m[8]  * m[2] * m[15] + 
                 m[8]  * m[3] * m[14] + 
                 m[12] * m[2] * m[11] - 
                 m[12] * m[3] * m[10];

        inv[9] = -m[0]  * m[9] * m[15] + 
                  m[0]  * m[11] * m[13] + 
                  m[8]  * m[1] * m[15] - 
                  m[8]  * m[3] * m[13] - 
                  m[12] * m[1] * m[11] + 
                  m[12] * m[3] * m[9];

        inv[13] = m[0]  * m[9] * m[14] - 
                  m[0]  * m[10] * m[13] - 
                  m[8]  * m[1] * m[14] + 
                  m[8]  * m[2] * m[13] + 
                  m[12] * m[1] * m[10] - 
                  m[12] * m[2] * m[9];

        inv[2] = m[1]  * m[6] * m[15] - 
                 m[1]  * m[7] * m[14] - 
                 m[5]  * m[2] * m[15] + 
                 m[5]  * m[3] * m[14] + 
                 m[13] * m[2] * m[7] - 
                 m[13] * m[3] * m[6];

        inv[6] = -m[0]  * m[6] * m[15] + 
                  m[0]  * m[7] * m[14] + 
                  m[4]  * m[2] * m[15] - 
                  m[4]  * m[3] * m[14] - 
                  m[12] * m[2] * m[7] + 
                  m[12] * m[3] * m[6];

        inv[10] = m[0]  * m[5] * m[15] - 
                  m[0]  * m[7] * m[13] - 
                  m[4]  * m[1] * m[15] + 
                  m[4]  * m[3] * m[13] + 
                  m[12] * m[1] * m[7] - 
                  m[12] * m[3] * m[5];

        inv[14] = -m[0]  * m[5] * m[14] + 
                   m[0]  * m[6] * m[13] + 
                   m[4]  * m[1] * m[14] - 
                   m[4]  * m[2] * m[13] - 
                   m[12] * m[1] * m[6] + 
                   m[12] * m[2] * m[5];

        inv[3] = -m[1] * m[6] * m[11] + 
                  m[1] * m[7] * m[10] + 
                  m[5] * m[2] * m[11] - 
                  m[5] * m[3] * m[10] - 
                  m[9] * m[2] * m[7] + 
                  m[9] * m[3] * m[6];

        inv[7] = m[0] * m[6] * m[11] - 
                 m[0] * m[7] * m[10] - 
                 m[4] * m[2] * m[11] + 
                 m[4] * m[3] * m[10] + 
                 m[8] * m[2] * m[7] - 
                 m[8] * m[3] * m[6];

        inv[11] = -m[0] * m[5] * m[11] + 
                   m[0] * m[7] * m[9] + 
                   m[4] * m[1] * m[11] - 
                   m[4] * m[3] * m[9] - 
                   m[8] * m[1] * m[7] + 
                   m[8] * m[3] * m[5];

        inv[15] = m[0] * m[5] * m[10] - 
                  m[0] * m[6] * m[9] - 
                  m[4] * m[1] * m[10] + 
                  m[4] * m[2] * m[9] + 
                  m[8] * m[1] * m[6] - 
                  m[8] * m[2] * m[5];
    //#endregion

       return new Matrix4x4(
           new Vector4(inv[0]*invDet, inv[4]*invDet, inv[8]*invDet, inv[12]*invDet),
           new Vector4(inv[1]*invDet, inv[5]*invDet, inv[9]*invDet, inv[13]*invDet),
           new Vector4(inv[2]*invDet, inv[6]*invDet, inv[10]*invDet, inv[14]*invDet),
           new Vector4(inv[3]*invDet, inv[7]*invDet, inv[11]*invDet, inv[15]*invDet)
       );
   }


   /******************
    * for optimizing
    ******************/

   static #temp = Matrix4x4.identity;

   assign(mat) {
       this.basisX.assignVector(mat.basisX);
       this.basisY.assignVector(mat.basisY);
       this.basisZ.assignVector(mat.basisZ);
       this.basisW.assignVector(mat.basisW);
       return this;
   }

   transposeNonAlloc(out) {
        out.basisX.assign(this.basisX.x, this.basisY.x, this.basisZ.x, this.basisW.x);
        out.basisY.assign(this.basisX.y, this.basisY.y, this.basisZ.y, this.basisW.y);
        out.basisZ.assign(this.basisX.z, this.basisY.z, this.basisZ.z, this.basisW.z);
        out.basisW.assign(this.basisX.w, this.basisY.w, this.basisZ.w, this.basisW.w);
        return out;
   }

   // mulMat() 와 같되, out 을 결과로 사용합니다.
   mulMatNonAlloc(out, ...mats) {
        out.assign(this); // out : Matrix4x4

        for(const mat of mats) {
            const matT = mat.transposeNonAlloc(Matrix4x4.#temp);

            out.basisX.assign(
                Vector4.dot(matT.basisX, out.basisX),
                Vector4.dot(matT.basisY, out.basisX),
                Vector4.dot(matT.basisZ, out.basisX),
                Vector4.dot(matT.basisW, out.basisX)
            );
            out.basisY.assign(
                Vector4.dot(matT.basisX, out.basisY),
                Vector4.dot(matT.basisY, out.basisY),
                Vector4.dot(matT.basisZ, out.basisY),
                Vector4.dot(matT.basisW, out.basisY)
            );
            out.basisZ.assign(
                Vector4.dot(matT.basisX, out.basisZ),
                Vector4.dot(matT.basisY, out.basisZ),
                Vector4.dot(matT.basisZ, out.basisZ),
                Vector4.dot(matT.basisW, out.basisZ)
            );
            out.basisW.assign(
                Vector4.dot(matT.basisX, out.basisW),
                Vector4.dot(matT.basisY, out.basisW),
                Vector4.dot(matT.basisZ, out.basisW),
                Vector4.dot(matT.basisW, out.basisW)
            );
        }
        return out;
   }


   // mulVector() 와 같되, 결과를 out 으로 저장합니다.
   mulVectorNonAlloc(out, v) {
        const matT = this.transposeNonAlloc(Matrix4x4.#temp);

        return out.assign(
            Vector4.dot(matT.basisX, v),
            Vector4.dot(matT.basisY, v),
            Vector4.dot(matT.basisZ, v),
            Vector4.dot(matT.basisW, v)
        );
   }
};


export class Plane {
    static #temp0 = Vector3.zero;

    planeEq;

    // `ax+by+cz+d` 의 계수들인 (a,b,c,d) 를 갖는 4차원 벡터를
    // 받아 `normal` 과 `d` 룰 갖는 평면의 방정식을 정의합니다.
    constructor(planeEq=new Vector4(0,1,0,0)) {
       this.planeEq = planeEq;
    }


    // 평면의 방정식을 나타내는 문자열을 돌려줍니다.
    toString() { return `normal : ${this.normal.toVector3()}, d : ${this.d}`; }



    // 점 `p` 가 평면의 바깥쪽에 있는지 여부를 돌려줍니다.
    isOutside(p) { return this.d + Vector3.dot(this.normal,p) > 0; }


    // 점 `p` 와 평면 사이의 최단 거리를 돌려줍니다.
    distance(p) { return this.d + Vector3.dot(this.normal,p); }


    // 평면의 방정식을 정규화시킵니다.
    normalize() {
        const invMagnitude = 1 / Plane.#temp0.assignVector(this.planeEq).magnitude;
    
        this.planeEq.mulNonAlloc(this.planeEq, invMagnitude);
    }

    // 평면의 방정식에서 normal 을 얻습니다.
    get normal() { return this.planeEq; }
    set normal(n=Vector3.up) { this.planeEq.assign(n.x, n.y, n.z, this.planeEq.w); }

    get d() { return this.planeEq.w; }
    set d(dist=0) { this.planeEq.w = dist; }
};


export class Frustum {
    static #temp0 = Matrix4x4.identity;

    planes = null;

    // finalMat를 바탕으로 6개의 평면을 가지는 절두체를 생성합니다.
    constructor(finalMat=null) {

        if(finalMat == null) {
            this.planes = [new Plane(), new Plane(), new Plane(), new Plane(), new Plane(), new Plane()];
            return;
        }
        const finalMatT = finalMat.transposeNonAlloc(Frustum.#temp0);

        const M0 = finalMatT.basisX;
        const M1 = finalMatT.basisY;
        const M2 = finalMatT.basisZ;
        const M3 = finalMatT.basisW;

        const right  = new Plane(M0.sub(M3) );         // M0-M3
        const left   = new Plane(M0.add(M3).mul(-1) ); // -(M0+M3)
        const top    = new Plane(M1.sub(M3));          // M1-M3
        const bottom = new Plane(M1.add(M3).mul(-1) ); // -(M1+M3)
        const far    = new Plane(M2.sub(M3) );         // M2-M3
        const near   = new Plane(M2.add(M3).mul(-1) ); // -(M2+M3)

        this.planes = [top, bottom, left, right, near, far];
    }

    // 새로운 절두체를 할당합니다.
    assign(finalMat) {
        const finalMatT = finalMat.transposeNonAlloc(Frustum.#temp0);

        const M0 = finalMatT.basisX;
        const M1 = finalMatT.basisY;
        const M2 = finalMatT.basisZ;
        const M3 = finalMatT.basisW;

        const top    = this.planes[0].planeEq;
        const bottom = this.planes[1].planeEq;
        const left   = this.planes[2].planeEq;
        const right  = this.planes[3].planeEq;
        const near   = this.planes[4].planeEq;
        const far    = this.planes[5].planeEq;

        M0.subNonAlloc(right, M3);                         // right = M0-M3
        M0.addNonAlloc(left, M3).mulNonAlloc(left,-1);     // left = -(M0+M3)
        M1.subNonAlloc(top, M3);                           // top = M1-M3
        M1.addNonAlloc(bottom, M3).mulNonAlloc(bottom,-1); // bottom = -(M1+M3)
        M2.subNonAlloc(far,M3);                            // far = M2-M3
        M2.addNonAlloc(near,M3).mulNonAlloc(near,-1);      // near = -(M2+M3)

        this.planes[0].normalize();
        this.planes[1].normalize();
        this.planes[2].normalize();
        this.planes[3].normalize();
        this.planes[4].normalize();
        this.planes[5].normalize();

        return this;
    }


    // 절두체를 나타내는 문자열을 돌려줍니다.
    toString() {
        let ret = `\ntop = {\n ${this.planes[0]} \n}`;
        ret += ` \n\nbottom = {\n ${this.planes[1]} \n}`;
        ret += ` \n\nleft = {\n ${this.planes[2]} \n}`;
        ret += ` \n\nright = {\n ${this.planes[3]} \n}`;
        ret += ` \n\nnear = {\n ${this.planes[4]} \n}`;
        ret += ` \n\nfar = {\n ${this.planes[5]} \n}`;
        return ret;
    }


    // 주어진 점이 절두체 내에 있는지를 판정합니다. 판정 결과는
    // Bound 열겨형을 통해 확인할 수 있습니다.
    checkBoundPoint(p) {
        
        for(const plane of this.planes) {
            
            if(plane.isOutside(p)) {
                return Bound.Outside;
            }
        }
        for(const plane of this.planes) {

            if(equalInTolerance(plane.distance(p), 0) ) {
                return Bound.Intersect;
            }
        }
        return Bound.Inside;
    }
};
