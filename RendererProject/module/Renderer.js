import {Vector2, Vector3, Vector4, Matrix4x4} from "./MyMath.js";
import * as MyMath from "./MyMath.js";
import {GameEngine, Transform, Camera} from "./GameEngine.js";

export const MeshType = {
    Normal  : 0,
    Skinned : 1
};

export class Color {
    r; g; b; a;


    // `color0`, `color1` 를 [0,1] 사이의 값인 `value` 만큼 보간합니다.
    static lerp(color0, color1, value) {
        return new Color(
            (color0.r + color1.r) * value,
            (color0.g + color1.g) * value,
            (color0.b + color1.b) * value,
            (color0.a + color1.a) * value
        );
    }


    // `color` 의 모든 성분들을 [min,max] 사이의 값으로 클램핑합니다.
    static clamp(color, min, max) {
        return new Color(
            MyMath.clamp(color.r, min, max),
            MyMath.clamp(color.g, min, max),
            MyMath.clamp(color.b, min, max),
            MyMath.clamp(color.a, min, max)
        );
    }



    static get red() { return new Color(1, 0, 0, 1); }
    static get green() { return new Color(0, 1, 0, 1); }
    static get blue() { return new Color(0, 0, 1, 1); }
    static get clear() { return new Color(0,0,0,0); }
    static get grey() { return new Color(0.5, 0.5, 0.5, 1); }
    static get white() { return new Color(1,1,1,1); }
    static get black() { return new Color(0,0,0,1); }

    // RGBA 색상을 생성합니다. 기본값은 white 입니다.
    constructor(r=1,g=1,b=1,a=1) {
       this.r = r;
       this.g = g;
       this.b = b;
       this.a = a;
    }


    // RGBA 색상을 나타내는 문자열을 돌려줍니다.
    toString() { return `rgba(${this.r*255},${this.g*255},${this.b*255},${this.a})`; }


    // 해당 색상의 복사본을 돌려줍니다.
    clone() { return new Color(this.r, this.g, this.b, this.a); }


    // 색상끼리 더해준 결과를 돌려줍니다.
    add(color) {
        return new Color(
            this.r + color.r,
            this.g + color.g,
            this.b + color.b,
            this.a + color.a
        );
    }

    // 색상끼리 빼준 결과를 돌려줍니다.
    sub(color) {
        return new Color(
            this.r - color.r,
            this.g - color.g,
            this.b - color.b,
            this.a - color.a
        );
    }


    // 색상끼리 곱해준 결과를 돌려줍니다.
    mulColor(color) {
        return new Color(
            this.r * color.r,
            this.g * color.g,
            this.b * color.b,
            this.a * color.a
        );
    }


    // 색상에 스칼라를 곱해줍니다.
    mulScalar(scalar) {
        return new Color(
            this.r * scalar,
            this.g * scalar,
            this.b * scalar,
            this.a * scalar
        );
    }
}; 


export class Material {
    mainTex       = null; // 메인 텍스쳐
    triangleCount = 0;    // 영향을 미칠 삼각형의 갯수. 

    vertexShader   = (vertex, finalMat)=>{ return finalMat.mulVectorNonAlloc(vertex,vertex); }; // 정점 셰이더
    fragmentShader = (uv,pos)=>{ return Renderer.tex2D(this.mainTex, uv); };                    // 픽셀 셰이더
}


export class Renderer {
    static #triangleList  = new Array(100);
    static #instanceCount = 0;

    camera       = Camera.mainCamera; 
    mainTexture  = null;
    mesh         = null;

    wireFrameColor  = Color.black; // 와이어 프레임의 선 색깔
    wireFrameMode   = false;       // 와이어 프레임으로 메시를 그릴지 여부
    backfaceCulling = true;        // 백페이스 컬링 적용 여부

    #vertexShader   = (vertex, finalMat)=>{ return finalMat.mulVectorNonAlloc(vertex,vertex); }; // 디폴트 정점 셰이더
    #fragmentShader = (uv, pos)=>{ return new Color(255, 0, 221,1); };                           // 디폴트 픽셀 셰이더

    materials = null; // SubMesh 들을 위해 사용합니다. 

    static #temp0 = new Vector4(); // Vector4 타입의 임시변수.
    static #temp1 = new Vector4(); // Vector4 타입의 임시변수.
    static #temp2 = new Vector2(); // Vector2 타입의 임시변수.
    static #temp3 = new Vector2(); // Vector2 타입의 임시변수.
    static #temp4 = new Vector2(); // Vector2 타입의 임시변수.
    static #temp5 = new Vector2(); // Vector2 타입의 임시변수.
    static #temp6 = new Vector2(); // Vector2 타입의 임시변수.
    static #temp7 = new Vector3(); // Vector3 타입의 임시변수.


    static #testFunc = [

        //#region function testOrigin(p) is deleted
        // 주어진 점이 원점 밖에 위치하는지 판정합니다 
        // function testOrigin(p) { return p.w < 0 ? 1 : 0; },
        //#endregion

        // 주어진 점이 근평면의 밖에 위치하는지 판정합니다.
        function testNear(p) { return p.z < -p.w ? 1 : 0; },

        // 주어진 점이 원평면의 밖에 위치하는지 판정합니다.
        function testFar(p) { return p.z > p.w ? 1 : 0; },

        // 주어진 점이 절두체의 좌측 평면 밖에 위치하는지 판정합니다.
        function testLeft(p) { return p.x < -p.w ? 1 : 0; },

        // 주어진 점이 절두체의 우측 평면 밖에 위치하는지 판정합니다.
        function testRight(p) { return p.x > p.w ? 1 : 0; },

        // 주어진 점이 절두체의 상단 평면 밖에 위치하는지 판정합니다.
        function testTop(p) { return p.y > p.w ? 1 : 0; },

        // 주어진 점이 절두체의 하단 평면 밖에 위치하는지 판정합니다.
        function testBottom(p) { return p.y < -p.w ? 1 : 0; }
    ];

    static #clipFunc = [

        //#region function clipOrigin(p0,p1,result) is deleted
        // 원점을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        // function clipOrigin(p0, p1, result) {
        //     const s = p1.position.w / (p0.position.w-p1.position.w);
            
        //     const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
        //     const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
        //     const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
        //     const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
        //     temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
        //     temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

        //     return result; // { position: Vector4, uv: Vector2 }
        // },
        //#endregion

        // 근평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipNear(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            
            const w0 = pos0.w;
            const w1 = pos1.w;
            const z0 = pos0.z;
            const z1 = pos1.z;

            const s = (-w1-z1) / (z0-z1+w0-w1);
            
            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        },


        // 원평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipFar(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            const s    = (pos1.w-pos1.z) / (pos0.z-pos1.z-pos0.w+pos1.w);
            
            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        },


        // 좌측평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipLeft(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            
            const w0 = pos0.w;
            const w1 = pos1.w;
            const x0 = pos0.x;
            const x1 = pos1.x;

            const s = (-w1-x1) / (x0-x1+w0-w1);

            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        },


        // 우측 평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipRight(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            const s    = (pos1.w-pos1.x) / (pos0.x-pos1.x-pos0.w+pos1.w);

            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        },


        // 상단평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipTop(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            const s    = (pos1.w-pos1.y) / (pos0.y-pos1.y-pos0.w+pos1.w);

            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        },


        // 하단평면을 경계로 p0, p1 사이를 클리핑한 점을 돌려줍니다.
        function clipBottom(p0, p1, result) {
            const pos0 = p0.position;
            const pos1 = p1.position;
            
            const w0 = pos0.w;
            const w1 = pos1.w;
            const y0 = pos0.y;
            const y1 = pos1.y;

            const s = (-w1-y1) / (y0-y1+w0-w1);

            const temp0 = p0.uv.mulNonAlloc(Renderer.#temp2, s);         // p0.uv * s
            const temp1 = p1.uv.mulNonAlloc(Renderer.#temp3, 1-s);       // p1.uv * (1-s)
            const temp2 = p0.position.mulNonAlloc(Renderer.#temp0, s);   // p0.position * s
            const temp3 = p1.position.mulNonAlloc(Renderer.#temp1, 1-s); // p1.position * (1-s)
            
            temp0.addNonAlloc(result.uv, temp1);       // uvClip       = (p0.uv * s) + (p1.uv * (1-s))
            temp2.addNonAlloc(result.position, temp3); // positionClip = (p0.position * s) + (p1.position * (1-s))

            return result; // { position: Vector4, uv: Vector2 }
        }
    ];


    // uv 좌표에 있는 texture 의 색상을 얻어옵니다.
    static tex2D(texture, uv) {
        const x = MyMath.clamp(
            Math.round(uv.x * texture.width), 0, texture.width-1
        );
        const y = MyMath.clamp(
            Math.round(uv.y * texture.height), 0, texture.height-1
        );
        return texture.getColor(x,y);
    }


    // 격자에 `from` 에서 `to` 를 잇는 선을 그립니다.
    // `from`, `to` 는 항상 월드 좌표계 위의 점이어야 합니다.
    drawLine2D(from, to, color=Color.black) {
        from = this.#worldToScreen(Renderer.#temp2, from);
        to   = this.#worldToScreen(Renderer.#temp3, to);

        // 그릴 선이 화면을 벗어나지 않도록 조정
        from.x = MyMath.clamp(from.x, 0, this.camera.screenSize.x);
        from.y = MyMath.clamp(from.y, 0, this.camera.screenSize.y);

        to.x = MyMath.clamp(to.x, 0, this.camera.screenSize.x);
        to.y = MyMath.clamp(to.y, 0, this.camera.screenSize.y);


        const w  = Math.abs(to.x - from.x);
        const h  = Math.abs(to.y - from.y);
        const w2 = 2*w;
        const h2 = 2*h;

        const dirX = (from.x < to.x) ? 1 : -1;
        const dirY = (from.y < to.y) ? 1 : -1;

        if(w > h) {
            let d = 2*h - w;

            for(let i=0; i<=w; ++i) {
                GameEngine.setPixel(from, color);

                if(d >= 0) {
                    d      -= w2;
                    from.y += dirY;
                }
                d += h2;
                from.x += dirX;
            }
        }

        else {
            let d = 2*w - h;

            for(let i=0; i<=h; ++i) {
                GameEngine.setPixel(from, color);

                if(d >= 0) {
                    d      -= h2;
                    from.x += dirX;
                }
                d      += w2;
                from.y += dirY;
            }
        }
    }


    // 격자에 `center` 를 중심점으로 하고, `radius` 를 반지름으로 하는
    // 원을 그립니다. `center` 는 항상 월드 좌표계 위의 점이어야 합니다.
    drawArc2D(center, radius, color=Color.black) {
        center = this.camera.worldToScreen(center);
        radius = radius * Camera.tileSize;

        const sqrRadius = radius * radius;
        const xMin      = center.x - radius;
        const xMax      = center.x + radius;
        const yMin      = center.y - radius;
        const yMax      = center.y + radius;
        
        for(let x=xMin; x<=xMax; ++x) {
            for(let y=yMin; y<=yMax; ++y) {
                const p = new Vector2(x,y);

                if(p.sub(center).sqrMagnitude <= sqrRadius) {
                    GameEngine.setPixel(p, color);
                }
            }
        }
    }


    // 2차원의 줄격자를 그립니다. 
    drawGizmo2D() {
        const screenSize = this.camera.screenToWorld(
            new Vector2(this.camera.screenSize.x, 0) 
        );
        const halfWidth  = screenSize.x;
        const halfHeight = screenSize.y;
        const TILE_SIZE  = 1;
        const color      = new Color(0,0,0, 0.2);

        for(let x=TILE_SIZE; x<=halfWidth; x+=TILE_SIZE) {
            this.drawLine2D(
                new Vector2(x, -halfHeight),
                new Vector2(x, halfHeight),
                color
            );
        }
        for(let x=-TILE_SIZE; x>=-halfWidth; x-=TILE_SIZE) {
            this.drawLine2D(
                new Vector2(x, -halfHeight),
                new Vector2(x, halfHeight),
                color
            );
        }
        for(let y=TILE_SIZE; y<=halfHeight; y+=TILE_SIZE) {
            this.drawLine2D(
                new Vector2(-halfWidth, y),
                new Vector2(halfWidth, y),
                color
            );
        }
        for(let y=-TILE_SIZE; y>=-halfHeight; y-=TILE_SIZE) {
            this.drawLine2D(
                new Vector2(-halfWidth, y),
                new Vector2(halfWidth, y),
                color
            );
        }

        this.drawLine2D(
            new Vector2(0, -halfHeight),
            new Vector2(0, halfHeight),
            Color.red
        );
        this.drawLine2D(
            new Vector2(-halfWidth, 0),
            new Vector2(halfWidth, 0),
            Color.green
        );
    }


    // 본의 가중치를 적용합니다.
    applySkeletal(original) {

        for(const p of [original.p0, original.p1, original.p2]) { // 세 정점들에 대해서 진행한다. 
            if(p.weight == null) continue;                        // 가중치가 존재하지 않으면, 스킵

            const boneNames = p.weight.bones;     // 이름들의 목록
            const weights   = p.weight.weights;   // 가중치들의 목록
            const boneCount = p.weight.boneCount; // 본들의 갯수

            let result = Renderer.#temp0.assign(0,0,0,0); // 혼합된 결과.

            for(let i=0; i<boneCount; ++i) {
                const bone   = this.mesh.bones[boneNames[i] ];
                const weight = weights[i];
                let   model  = bone.skeletal();

                // 각 본의 최종행렬을 적용후, 가중치를 곱한다.
                const temp0 = model.mulVectorNonAlloc(Renderer.#temp1, p.position); // model * p.position
                const temp1 = temp0.mulNonAlloc(temp0, weight);                     // weight * (model * p.position)

                result.addNonAlloc(result, temp1); // result += temp1
            }
            p.position.assign(result.x, result.y, result.z, 1); // p.position = (result,1)
        }
    }


    // index 번호에 있는 삼각형 객체를 얻습니다.
    #getTriangle(index) {

        if(Renderer.#instanceCount == index) {

            return Renderer.#triangleList[Renderer.#instanceCount++] = {
                p0: { position: new Vector4(), uv: new Vector2(), weight: null }, 
                p1: { position: new Vector4(), uv: new Vector2(), weight: null }, 
                p2: { position: new Vector4(), uv: new Vector2(), weight: null }
            };
        }
        return Renderer.#triangleList[index];
    }


    // `mesh` 를 그립니다. 정점변환을 수행하기 위해,
    // 모델링 행렬 `M` 과 뷰 행렬 `V`, 원근투영 행렬 `P` 를 곱한 최종 행렬인
    // `finalMat` 를 또한 인자로 받습니다.
    drawMesh(finalMat) {
        const triangleCount = this.mesh.triangleCount;

        let materialIndex  = 0; // 현재 사용할 머터리얼의 번호
        let materialAffect = 0; // 현재 머터리얼로 그려야할 삼각형의 갯수
        
        for(let i=0; i<triangleCount; ++i) {
            const original = this.mesh.setTriangle(this.#getTriangle(0), i);
            let   listSize = 1;
            
            if(this.mesh.type==MeshType.Skinned) { // 스켈레탈 애니메이션. 본을 가지고 있다면,
                this.applySkeletal(original);      // 본의 가중치를 적용한다.
            }

            // 정점 변환. 월드 좌표를 클립 좌표로 변환한다.
            original.p0.position = this.#vertexShader(original.p0.position, finalMat);
            original.p1.position = this.#vertexShader(original.p1.position, finalMat);
            original.p2.position = this.#vertexShader(original.p2.position, finalMat);


            // `original` 삼각형이 절두체에 꼭 맞을 때까지 쪼갠다.
            // 총 7개의 평면에 대해서 수행한다: near, far, top, bottom, left, right
            for(let i=0; i<6; ++i) {

                for(let j=0; j<listSize; ++j) {
                    const triangle = Renderer.#triangleList[j];
                    let   p0       = triangle.p0;
                    let   p1       = triangle.p1;
                    let   p2       = triangle.p2;

                    const result0 = Renderer.#testFunc[i](p0.position);
                    const result1 = Renderer.#testFunc[i](p1.position);
                    const result2 = Renderer.#testFunc[i](p2.position);
                    const count   = result0 + result1 + result2;

                    // 세 점이 모두 평면의 바깥에 위치한다면, 그리기에서 제외한다.
                    if(count==3) {
                        Renderer.#triangleList[j--]      = Renderer.#triangleList[--listSize];
                        Renderer.#triangleList[listSize] = triangle;
                    }

                    // 두 점만 평면의 바깥에 위치한 경우, 삼각형의 일부를 잘라준다.
                    else if(count==2) {

                        if(result0==1) {
                            if     (result1==1) { p0=triangle.p2; p1=triangle.p0; p2=triangle.p1; }
                            else if(result2==1) { p0=triangle.p1; p1=triangle.p2; p2=triangle.p0; }
                        }
                        const p01Clip = Renderer.#clipFunc[i](p0,p1, p1);
                        const p02Clip = Renderer.#clipFunc[i](p0,p2, p2);

                        triangle.p0 = p0;
                        triangle.p1 = p01Clip;
                        triangle.p2 = p02Clip;
                    }

                    // 한 점만 평면의 바깥에 위치한 경우, 삼각형의 일부를 잘라준다.
                    else if(count==1) {
                        if     (result0==1) { p0=triangle.p1; p1=triangle.p2; p2=triangle.p0; }
                        else if(result1==1) { p0=triangle.p2; p1=triangle.p0; p2=triangle.p1; }

                        const newTriangle = this.#getTriangle(listSize++); // p0-p1-p12Clip

                        newTriangle.p0.position.assignVector(p0.position); newTriangle.p0.uv.assignVector(p0.uv); // p0 의 내용을 복사
                        newTriangle.p1.position.assignVector(p1.position); newTriangle.p1.uv.assignVector(p1.uv); // p1 의 내용을 복사
                        
                        const p12Clip = Renderer.#clipFunc[i](p1,p2, newTriangle.p2); // newTriangle.p2 를 p12Clip 으로 초기화
                        const p02Clip = Renderer.#clipFunc[i](p0,p2, p2);             // p2 를 p02Clip 으로 초기화

                        p1.position.assignVector(p12Clip.position); p1.uv.assignVector(p12Clip.uv); // p12Clip 의 내용을 복사

                        // 기존의 삼각형은 쪼개진 버전으로 갱신해준다: p0-p12Clip-p02Clip
                        triangle.p0 = p0;
                        triangle.p1 = p1;
                        triangle.p2 = p02Clip;
                    }
                }
            }

            // 쪼개진 삼각형들을 모두 그려준다.
            for(let i=0; i<listSize; ++i) {
                const t = Renderer.#triangleList[i];

                if(this.materials != null) {
                    this.drawTriangle(t, this.materials[materialIndex].fragmentShader);
                }
                else {
                    this.drawTriangle(t, this.#fragmentShader);
                }
                Renderer.#triangleList[i].p0.weight = null; // for optimizing GC
                Renderer.#triangleList[i].p1.weight = null; // for optimizing GC
                Renderer.#triangleList[i].p2.weight = null; // for optimizing GC
            }

            // 서브 메시를 사용하고, 현재 머터리얼이 정해진 수의 삼각형에게 영향을 주었다면,
            // 이후의 삼각형들은 다음 머터리얼을 적용한다.
            if(this.materials!=null && ++materialAffect == this.materials[materialIndex].triangleCount) {
                materialAffect = 0;
                materialIndex++;
            }
        }
    }


    // `triangle` 의 `p0-p1-p2` 가 이루는 삼각형을 픽셀화시킵니다.
    // 또한, 최종 픽셀을 결정하기 위한 `fragmentShader` 를 인자로 받습니다.
    drawTriangle(triangle, fragmentShader) {

        // 클립 좌표계의 깊이값 보존
        const zPos0 = triangle.p0.position.w;
        const zPos1 = triangle.p1.position.w;
        const zPos2 = triangle.p2.position.w;

        // 변환을 최종적으로 마무리 한다.
        this.#toNDCAndStretch(triangle.p0.position);
        this.#toNDCAndStretch(triangle.p1.position);
        this.#toNDCAndStretch(triangle.p2.position);


        // 백페이스 컬링. 카메라의 시선과 같은 방향이라면 그리기 생략
        if(this.backfaceCulling) {

            const triangleNorm = Vector3.crossNonAlloc(
                Renderer.#temp7,
                triangle.p0.position.subNonAlloc(Renderer.#temp0, triangle.p2.position),
                triangle.p1.position.subNonAlloc(Renderer.#temp1, triangle.p2.position)
            );
            const forward = Renderer.#temp0.assign(0,0,1,0); 

            if(Vector3.dot(triangleNorm, forward) >= 0) {
                return;
            }
        }
        

        // 와이어 프레임 모드일 경우, 
        if(this.wireFrameMode) {
            this.drawLine2D(triangle.p0.position, triangle.p1.position, this.wireFrameColor);
            this.drawLine2D(triangle.p1.position, triangle.p2.position, this.wireFrameColor);
            this.drawLine2D(triangle.p2.position, triangle.p0.position, this.wireFrameColor);
            return;
        }

        // 픽셀화를 위해, 월드 좌표계로 변경. 결과는 Vector2
        const p0 = this.#worldToScreen(Renderer.#temp2, triangle.p0.position);
        const p1 = this.#worldToScreen(Renderer.#temp3, triangle.p1.position);
        const p2 = this.#worldToScreen(Renderer.#temp4, triangle.p2.position); // #temp4 must be preserved
        
        const u = p0.subNonAlloc(Renderer.#temp5, p2); // #temp5 must be preserved
        const v = p1.subNonAlloc(Renderer.#temp6, p2); // #temp6 must be preserved

        const uu  = Vector2.dot(u,u);
        const vv  = Vector2.dot(v,v);
        const uv  = Vector2.dot(u,v);
        let   div = uu*vv - uv*uv;

        if(div==0) { // 퇴화 삼각형이라면,
            return;  // 그리기를 종료
        }
        div = 1 / div;

        // 삼각형의 영역을 사각형으로 지정하되, 화면에 보이는 곳만 픽셀을 찍는다.
        const xMin = MyMath.clamp(
            Math.min(p0.x, p1.x, p2.x), 0, this.camera.x
        );
        const xMax = MyMath.clamp(
            Math.max(p0.x, p1.x, p2.x), 0, this.camera.x
        );
        const yMin = MyMath.clamp(
            Math.min(p0.y, p1.y, p2.y), 0, this.camera.y
        );
        const yMax = MyMath.clamp(
            Math.max(p0.y, p1.y, p2.y), 0, this.camera.y
        );

        const uv0 = triangle.p0.uv;
        const uv1 = triangle.p1.uv;
        const uv2 = triangle.p2.uv;

        for(let x=xMin; x<=xMax; ++x) {
            for(let y=yMin; y<=yMax; ++y) {
                const p  = Renderer.#temp2.assign(x,y);        // p = (x,y)
                const w  = p.subNonAlloc(Renderer.#temp3, p2); // w = p - p2
                const wu = Vector2.dot(w,u);
                const wv = Vector2.dot(w,v);

                const s = (wu*vv - wv*uv) * div;
                const t = (wv*uu - wu*uv) * div;
                const oneMinusST = 1-s-t;

                // 모든 계수가 [0,1] 범위 내에 있다면, 점을 그립니다.
                if((0<=s) && (s<=1) && (0<=t) && (t<=1) && (0<=oneMinusST) && (oneMinusST<=1) ) {

                    // 이전에 찍었던 픽셀에 가려져야 한다면, 그리기를 넘어갑니다.
                    const depthIndex = p.x * this.camera.screenSize.x + p.y;
                    const depth      = zPos0*s + zPos1*t + zPos2*oneMinusST; 

                    if(this.camera.depthBuffer[depthIndex] < depth) {
                       continue;
                    }
                    this.camera.depthBuffer[depthIndex] = depth;


                    // 원근보정 매핑 
                    const invZ0 = 1 / zPos0;
                    const invZ1 = 1 / zPos1;
                    const invZ2 = 1 / zPos2;

                    const viewZ = 1 / (s * invZ0 + t * invZ1 + oneMinusST * invZ2);
                    const t0    = s * viewZ * invZ0;
                    const t1    = t * viewZ * invZ1;
                    const t2    = oneMinusST * viewZ * invZ2;


                    // UV 좌표 계산 후, 픽셀쉐이더 적용
                    const uvPos = Renderer.#temp3.assign(
                        (uv0.x * t0) + (uv1.x * t1) + (uv2.x * t2),
                        (uv0.y * t0) + (uv1.y * t1) + (uv2.y * t2),
                    );
                    const rgba = fragmentShader(uvPos, Renderer.#temp7.assign(p.x, p.y, viewZ));
                    GameEngine.setPixel(p, rgba);
                }
            }
        }
    }


    // 클립 좌표를 NDC 좌표계로 변경한 뒤, 종횡비를 곱해 화면 크기만큼 늘려줍니다.
    // 결과는 pClip 에 그대로 저장합니다. 결과는 Vector4 입니다.
    #toNDCAndStretch(pClip) {
        
        if(pClip.w==0) {
            pClip.w = Number.EPSILON;
        }
        pClip.mulNonAlloc(pClip, (1/pClip.w) ); // pClip = this.camera.clipToNDC(pClip);

        const halfw = this.camera.screenSize.x * 0.5 / Camera.tileSize;
        const halfh = this.camera.screenSize.y * 0.5 / Camera.tileSize;

        pClip.assign( // pClip = this.camera.stretchNDC(pClip);
            pClip.x * halfw,
            pClip.y * halfh,
            pClip.z,
            1
        );
    }


    // 월드 좌표계를 스크린 좌표계로 변환합니다. 결과는 Vector2 이며,
    // out 에 그대로 저장합니다.
    #worldToScreen(out, worldPosition) {
        const halfw = this.camera.screenSize.x * 0.5;
        const halfh = this.camera.screenSize.y * 0.5;

        return out.assign(
            Math.round(worldPosition.x * Camera.tileSize + halfw),
            Math.round(-worldPosition.y * Camera.tileSize+ halfh)
        );
    }


    // 머터리얼이 존재하지 않을 경우, 사용되는 디폴트 셰이더들을 얻습니다.
    get defaultFragmentShader() { return this.#fragmentShader; }
    get defaultVertexShader()   { return this.#vertexShader;   }


    // 사용자 정의 머터리얼을 설정하거나 얻습니다. 해당 값은
    // `materials[0]` 을 하는 것과 같습니다.
    get material() { return this.materials[0]; }
    set material(newMat) {
        if(this.materials==null) {
            this.materials = [];
        }
        this.materials[0] = newMat;
    }
};


export class Texture {
    static $cvs = document.createElement("canvas");
    static $ctx = Texture.$cvs.getContext('2d', { willReadFrequently : true});

    $width; $height;
    $colorData;
    $loaded;

    // `path` 경로에 있는 이미지를 로드하고, 색상 정보를 추출합니다.
    constructor(path, onload=null) {
        const image = new Image();

        image.onload = ()=>{
           Texture.$cvs.width  = this.$width  = image.width;
           Texture.$cvs.height = this.$height = image.height;
           
           Texture.$ctx.drawImage(image, 0, 0, this.$width, this.$height);

           this.$colorData = [];
           const inv255    = 1 / 255;
           const imageData = Texture.$ctx.getImageData(0, 0, this.$width, this.$height).data;

           for(let i=0; i<imageData.length; i+=4) {
              const R = imageData[i] * inv255;
              const G = imageData[i+1] * inv255;
              const B = imageData[i+2] * inv255;
              const A = imageData[i+3];
              this.$colorData.push(new Color(R,G,B,A) );
           }
           this.$loaded = true;

           if(onload!=null) {
              onload(this);
           }
           
        };
        this.$loaded = false;
        image.src    = path;
    }


    // 임의의 픽셀의 색상을 얻어옵니다.
    getColor(x,y) {
       
        if(arguments.length == 1) {
           const v = x;
           x = v.x; y = v.y;
        }
        return this.$colorData[y*this.$width + x]; // readonly
    }

    // 이미지의 너비를 돌려줍니다.
    get width() { return this.$width; }

    // 이미지의 높이를 돌려줍니다.
    get height() { return this.$height; }


    // 이미지 로드가 완료되었는지 여부를 돌려줍니다.
    get loaded() { return this.$loaded; }
};


export class Weight {
    bones     = null; // 연결된 본들의 목록
    weights   = null; // 본들에게 받는 영향력

    // `bones` 는 정점에게 영향을 미치는 본들의 목록
    // `weight` 는 각 본들이 주는 가중치 값들의 목록
    constructor(bones, weights) {
        this.bones   = bones;
        this.weights = weights;
    }

    // 본의 갯수를 얻습니다.
    get boneCount() { return this.bones.length; }
};


export class Mesh {
    indices  = null; // 인덱스 버퍼. 삼각형 하나는 6개의 점들로 구성되며, [vert0,vert1,vert2, uv0,uv1,uv2] 의 순서로 구성되어야 합니다.
    vertices = null; // 정점들의 목록. 월드 좌표로 나타내야 합니다.
    uvs      = null; // UV 점들의 목록. 각 점들의 성분들은 [0,1] 범위를 가지고 있어야 합니다.
    bones    = null; // 본의 목록
    weights  = null; // 정점마다 자신에게 영향을 주는 본을 기억. vertices 에서의 인덱스가 곧 weights 에서의 인덱스입니다.
    collider = null; // 메시의 콜라이더. 

    boneVisible = false; // 본들을 그릴지 말지 여부를 결정합니다. 


    // index 번째 삼각형을 얻습니다. 삼각형은 p0-p1-p2 로 이루어집니다.
    // 삼각형 데이터는 가비지 생성을 피하기 위해, out 에 저장합니다. 
    // 이후 out 을 그대로 돌려줍니다.
    setTriangle(out, index) {
        const startIndex = index * 6;

        const position0 = this.vertices[this.indices[startIndex] ];
        const position1 = this.vertices[this.indices[startIndex+1] ];
        const position2 = this.vertices[this.indices[startIndex+2] ];
        
        const uv0 = this.uvs[this.indices[startIndex+3] ];
        const uv1 = this.uvs[this.indices[startIndex+4] ];
        const uv2 = this.uvs[this.indices[startIndex+5] ];

        let weight0 = null;
        let weight1 = null;
        let weight2 = null;

        // skinned mesh 라면, 삼각형에 영향을 미치는 본들의 정보 또한 포함시킨다.
        if(this.type == MeshType.Skinned) {
            const startIndex = index * 3;
            
            weight0 = this.weights[startIndex];
            weight1 = this.weights[startIndex+1];
            weight2 = this.weights[startIndex+2];
        }

        out.p0.position.assign(position0.x, position0.y, position0.z, 1); out.p0.uv.assignVector(uv0); out.p0.weight = weight0;
        out.p1.position.assign(position1.x, position1.y, position1.z, 1); out.p1.uv.assignVector(uv1); out.p1.weight = weight1;
        out.p2.position.assign(position2.x, position2.y, position2.z, 1); out.p2.uv.assignVector(uv2); out.p2.weight = weight2;

        return out;
    }


    // 삼각형의 갯수를 얻습니다.
    get triangleCount() { return this.indices.length / 6; }


    // 정점의 갯수를 얻습니다.
    get vertexCount() { return this.vertices.length; }


    // UV 좌표의 갯수를 얻습니다.
    get uvCount() { return this.uvs.length; }


    // 메시의 종류를 얻습니다.
    get type() {

        if(this.bones==null) {
            return MeshType.Normal;
        }
        return MeshType.Skinned;
    }
};
