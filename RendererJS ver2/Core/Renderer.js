
import {Vector2, Vector3, Vector4, Matrix4x4, Quaternion, MyMath} from "./MyMath.js";
import {GameEngine, KeyCode, GameObject} from "./GameEngine.js";
import {Camera} from "./Camera.js";
import { Material, Color, Shader } from "./Shader.js";
import {Vertex, Triangle, Mesh,Bone} from "./Mesh.js";


/**  */
export class Renderer {
    static #clipLine  = [clipNear, clipFar, clipBottom, clipTop, clipLeft, clipRight];
    static #testPoint = [testNear, testFar, testBottom, testTop, testLeft, testRight];
    static #triangles = new Array(30);

    static #width;
    static #pixelBuffer;
    static #depthBuffer;
    static #prevZ;

    static #triangleView = new Triangle();
    static #color0       = new Color();
    static #color1       = new Color();
    static #vertex3      = new Vertex();

    static #temp0 = new Vector2();
    static #temp1 = new Vector2();
    static #temp2 = new Vector2();
    static #temp3 = new Vector2();


    /** 현재 사용중인 카메라 */
    static camera;


    /** 렌더링할 Mesh 에 적용할 Material[]. */
    materials = [Shader.DEFAULT_MATERIAL];


    /** 렌더링할 Mesh */
    mesh = null;


    /** this.mesh.bones 를 렌더링할지 여부를 나타내는 boolean. */
    boneVisible = false;


    /////////////////////////
    // Instance methods    //
    /////////////////////////


    /** Renderer 를 생성합니다. */
    constructor() {
        
        if(Renderer.#triangles[0] == null) {

            for(let i=0; i<30; ++i) {
                Renderer.#triangles[i] = new Triangle(new Vertex(), new Vertex(), new Vertex());
                Renderer.#triangles[i].j = 0;
            }
        }
    }


    /** 현재 카메라에 this.mesh 를 렌더링합니다. 기본적으로 메시의 모든 삼각형을 렌더링하지만, triangleStart, count
     * 
     *  인자를 주는 것으로 [triangleStart, triangleStart+count) 범위의 삼각형들만 렌더링하도록 할 수 있습니다. 
     * 
     *  boneVisible = true 라면, this.mesh.bones 또한 렌더링합니다. */
    renderMesh(triangleStart=0, count=Number.MAX_SAFE_INTEGER) {

        if(this.mesh == null) {
            return;
        }
        let material     = null;
        let submeshIndex = 0;
        let submeshBegin = triangleStart;
        let submeshEnd   = 0;

        for(let i=0; i<this.materials.length; ++i) {       // [triangleStart, triangleStart+count) 범위에 해당하는
            submeshEnd += this.materials[i].triangleCount; // submeshIndex, submeshEnd 를 계산한다.
            
            if(submeshBegin < submeshEnd) {
                submeshIndex   = i;
                material       = this.materials[i];
                material.bones = this.mesh.bones;
                break;
            }
        }
        const triangleCount = MyMath.clamp(submeshBegin+count, submeshBegin, this.mesh.triangleCount);

        for(let i=submeshBegin; i<triangleCount; ++i) {                            // [submeshBegin, submeshBegin + triangleCount) 범위의 삼각형들을 렌더링한다.
            const triangleView = this.mesh.getTriangle(i, Renderer.#triangleView); // this.mesh 로부터 읽어온 Triangle 은 항상 읽기 전용(read-only view)이다.
            const triangle0    = Renderer.#triangles[0];                           // triangle0 은 VertexOut 의 결과를 담는 수정 가능한(writable) Triangle 이다.

            if(submeshBegin++ == submeshEnd && submeshBegin < triangleCount) { // 현재 submesh 의 삼각형들을 전부 렌더링했다면
                material = this.materials[++submeshIndex];                     // 다음 submesh 를 이어서 렌더링한다.
                submeshEnd += material.triangleCount;
                material.bones = this.mesh.bones;
            }

            material.vertexShader(triangleView.vertex0, triangle0.vertex0, material); // triangle0.vertex0 = vertexShader(triangleView.vertex0);
            material.vertexShader(triangleView.vertex1, triangle0.vertex1, material); // triangle0.vertex1 = vertexShader(triangleView.vertex1);
            material.vertexShader(triangleView.vertex2, triangle0.vertex2, material); // triangle0.vertex2 = vertexShader(triangleView.vertex2);

            if(material.backfaceCulling && triangle0.backface) { // backfaceCulling = true 라면, 카메라와 마주보고 있는 삼각형들만 렌더링한다.
                continue;                                        // true 라면 #clipTriangle0, drawTriangle2D 를 건너뛴다.
            }
            if(material.usePerspective) {                                  // usePerspective = true 라면, 원근투영을 사용하며 삼각형의 정점들은 모두 클립 좌표(clip coordinate)라고 생각한다.
                const count = Renderer.clipTriangle0(Renderer.#triangles); // NDC 공간에서 클리핑이 가능해지며, clipTriangle0() 함수로 삼각형 클리핑(triangle clipping)을 수행한다.

                for(let j=0; j<count; ++j) {
                    Renderer.drawTriangle2D(Renderer.#triangles[j], material); // 쪼개진 삼각형(sub-triangle)들을 모두 그려준다.
                }
            }
            else {                                            // 
                Renderer.drawTriangle2D(triangle0, material); //
            }
        }

        this.renderBones();
    }


    /** 현재 카메라에 this.mesh.bones 를 렌더링합니다.  */
    renderBones() {

        if(this.boneVisible && this.mesh && this.mesh.bones) {
            const renderer = Bone.renderer;
            const finalMat = Shader.FINAL_MATRIX.clone();

            for(let keyvalue of this.mesh.bones) {
                const child  = keyvalue[1];
                const parent = child.parent;

                if(parent == null) {
                    continue;
                }
                const p0 = child.position;
                const p1 = parent.position;

                const fromDir = Vector3.up;          // fromDir = (0,1,0)
                const toDir   = Vector3.sub(p1, p0); // toDir   = p0 - p0

                const size = toDir.magnitude;
                const S    = new Matrix4x4();
                const TR   = Quaternion.fromTo(fromDir, toDir).toMatrix4x4();

                S.basisX.x = size * 0.1;
                S.basisY.y = size;
                S.basisZ.z = size * 0.1;
                TR.basisW.assign(p0.x, p0.y, p0.z, 1);

                S.mulMat(TR, finalMat, Shader.FINAL_MATRIX); // Shader.FINAL_MATRIX = (finalMat · TR · S)

                renderer.renderMesh();
            }
        }
    }


    /** materials[0] 를 얻거나 설정합니다. 첫번째 submesh 에 적용할 Material 을 의미합니다. */
    get material() { return this.materials[0]; }
    set material(newMat) { this.materials[0] = newMat; }



    //////////////////////////
    // Static methods       //
    //////////////////////////


    /** triangles[0] 을 NDC 공간에 맞도록 잘라내는 삼각형 클리핑(triangle clipping)을 진행합니다. Triangle 의 정점들은 모두 클립 좌표(clip coordinate)이여야 하는데,
     * 
     *  선형결합(linear combination)을 하기 위해서는 선분(segment)이 일정한 기울기를 가진 직선의 형태를 하고 있어야하기 때문입니다. 
     * 
     *  clipTriangle0 이 잘라낸 Triangle 들은 triangles 에 저장되며, 그려야할 삼각형의 갯수(number)를 돌려줍니다. 
     * 
     *  triangles 은 충분한 크기로 할당되었다고 생각하는 Triangle[] 입니다. */
    static clipTriangle0(triangles) {
        let count = 1;

        triangles[0].j = 0;

        for(let i=0; i<count; ++i) {
            const triangle = triangles[i];

            for(let j=triangle.j; j<6; ++j) {             
                const testPoint = Renderer.#testPoint[j]; // near - far - bottom - top - left - right 평면 순으로 triangle 을 잘라낸다. 
                const clipLine  = Renderer.#clipLine[j];  // 

                const vertex0  = triangle.vertex0;
                const vertex1  = triangle.vertex1;
                const vertex2  = triangle.vertex2;
                
                const result0 = testPoint(vertex0.position); // vertex0 이 평면 안에 있는지 검사한다.
                const result1 = testPoint(vertex1.position); // vertex1 이 평면 안에 있는지 검사한다.
                const result2 = testPoint(vertex2.position); // vertex2 가 평면 안에 있는지 검사한다.
                const result  = result0 + result1 + result2; // 평면 안에 위치한 정점의 갯수.

                if(result == 0) {                          // case 0) 정점이 모두 평면 밖에 있는 경우.
                    triangles[i--]   = triangles[--count]; //         triangle 은 NDC 공간 밖에 있으므로 폐기한다.
                    triangles[count] = triangle;           //         triangles 의 맨 마지막 삼각형을 i 위치로 옮긴다.
                    break;                                                   
                }
                else if(result == 1) {              // case 1) 한 개의 정점만 평면 안에 있는 경우.
                                                    //         triangle = { p0, p0p1, p0p2 } 가 되도록 잘라준다.
                    if(result1 == 1) {              //         항상 triangle.vertex0 이 평면 안에 있다고 생각하고 진행한다.
                        triangle.vertex0 = vertex1; //         vertex1/vertex2 가 평면 안에 있다면, triangle 의 정점 순서를 수정한다.
                        triangle.vertex1 = vertex2;
                        triangle.vertex2 = vertex0;
                    }
                    else if(result2 == 1) {         
                        triangle.vertex0 = vertex2; 
                        triangle.vertex1 = vertex0;
                        triangle.vertex2 = vertex1;
                    }
                    clipLine(triangle.vertex0, triangle.vertex1, triangle.vertex1); // p0p1
                    clipLine(triangle.vertex0, triangle.vertex2, triangle.vertex2); // p0p2
                }
                else if(result == 2) {              // case 2) 두 개의 정점이 평면 안에 있는 경우. 
                                                    //         triangle = { p0p1, p2p1, p2 }, triangle2 = { p0, p0p1, p2 }
                    if(result0 == 0) {              //         이 되도록 잘라준다. 항상 triangle.vertex1 이 평면 바깥에 있다고 생각하고 진행한다.
                        triangle.vertex0 = vertex2; //         즉 vertex0/vertex2 가 평면 밖에 있다면, triangle 의 정점 순서를 수정한다.
                        triangle.vertex1 = vertex0;
                        triangle.vertex2 = vertex1;
                    }
                    else if(result2 == 0) {
                        triangle.vertex0 = vertex1;
                        triangle.vertex1 = vertex2;
                        triangle.vertex2 = vertex0;
                    }
                    const triangle2 = triangles[count++]; // triangle2 = { p0p1, p2p1, p2 }

                    clipLine(triangle.vertex0, triangle.vertex1, triangle2.vertex0); // p0p1
                    clipLine(triangle.vertex2, triangle.vertex1, triangle2.vertex1); // p2p1
                    triangle2.vertex2.assign(triangle.vertex2);                      // p2

                    triangle.vertex1.assign(triangle2.vertex0); // triangle = { p0, p0p1, p2 }

                    triangle2.j = j+1; // triangle2 는 triangle 이 검사했던 평면을 다시 검사할 필요없다.
                                       // 또한 부동소수점 오차(round error)로 인한 무한 루프(infinite loop)를 방지한다.
                }
            }
        }

        return count;
    }


    /** Renderer.renderXXX(), Renderer.drawXXX() 들의 결과를 담을 Uint32Array 를 설정합니다. */
    static setPixelBuffer(uint32Array, width, height) {
        Renderer.#pixelBuffer = uint32Array;
        Renderer.#width       = width;
        Renderer.#depthBuffer = new Float32Array(width * height);

        Renderer.#depthBuffer.fill(Number.POSITIVE_INFINITY, 0);
    }
    

    /** screenPoint 위치의 픽셀의 색상을 color 로 설정합니다. */
    static setPixel(screenPoint, color) {
        const width = Renderer.#width;
        const index = screenPoint.y*width + screenPoint.x;
        const data  = Renderer.#pixelBuffer;

        if(index < 0 || index >= data.length) {
            const resolution = GameEngine.getResolution();
            throw new RangeError(`[Renderer.setPixel] screenPoint ${screenPoint} must be between (0,0) and (${resolution.x}, ${resolution.y})`);
        }
        if(color.rgba < 0xff000000) { // Color.a < 255 라면, 투명도(transparency)가 적용된다.
                                      // Blend SrcAlpha OneMinusSrcAlpha 이며, 선형결합으로 색상을 혼합시킨다.
            if(color.rgba == 0) {
                Renderer.#depthBuffer[index] = Renderer.#prevZ; // Color.clear 에 해당하는 경우, 어떠한 색상도 존재하지 않기에
                return;                                         // zTest() 에 설정한 깊이값을 #prevZ 로 복구하고 종료한다.
            }
            const dest = Renderer.#color1;
            dest.rgba = data[index];
            color = Color.lerp(dest, color, color.a*0.00392157, dest);
        }

        data[index] = color.rgba;
    }


    /** 깊이 버퍼(depthBuffer)의 z 값과 비교합니다. 결과는 boolean 이며, 결과가 true 라면
     * 
     *  카메라와 더 가깝다는 의미이기에 현재 픽셀값을 덮어씌워야 합니다. 이 과정은
     * 
     *  Renderer.setPixel 함수로 수행하면 됩니다. 깊이 버퍼는 자동으로 갱신됩니다. */
    static zTest(screenPoint, z) {
        const depthBuffer = Renderer.#depthBuffer;
        const index       = Renderer.#width*screenPoint.y + screenPoint.x;
        const curZ        = depthBuffer[index];

        if(curZ >= z) {
            Renderer.#prevZ = curZ;
            depthBuffer[index] = z;
            return true;
        }
        return false;
    }


    /** 현재 카메라의 영역에 해당하는 깊이 값들을 모두 +Infinity 로 초기화합니다.  */
    static clearDepthBuffer() {
        const depthBuffer = Renderer.#depthBuffer;
        const width       = Renderer.#width;
        const camera      = Renderer.camera;
    
        const xMin = camera.sx;
        const xMax = camera.sx + camera.width;
        const yMin = camera.sy;
        const yMax = camera.sy + camera.height;
    
        for(let y=yMin; y<yMax; ++y) {
    
            for(let x=xMin; x<xMax; ++x) {
                depthBuffer[width*y+x] = Number.POSITIVE_INFINITY;
            }
        }
        Renderer.#prevZ = Number.POSITIVE_INFINITY;
    }


    /** 현재 카메라의 평면에 center 를 중심점으로 하고, radius 를 반지름으로 갖는 원의 호(Arc)을 그립니다. 
     * 
     *  center 는 항상 월드 좌표(world coordinate)이어야 합니다. fill = true 라면 원의 내부를 채워줍니다. */
    static drawArc2D(center, radius, color, fill=false) {
        const camera = Renderer.camera;
        const min    = camera.min;
        const max    = camera.max;

        const temp0      = Renderer.#temp0;
        const temp1      = Renderer.#temp1;
        const temp2      = Renderer.#temp2;
        const sqrRadius  = radius * radius;
        const sqrRadius1 = (radius-1) * (radius-1);
        
        center = camera.worldToScreen(center, temp0);
        radius = Math.round(radius);

        const xMin = MyMath.clamp(center.x-radius, min.x, max.x); // x = [xMin, xMax], y = [yMin, yMax] 인 사각형 영역에서
        const xMax = MyMath.clamp(center.x+radius, min.x, max.x); // 원의 영역에 위치한 점들만을 찾아낸다.
        const yMin = MyMath.clamp(center.y-radius, min.y, max.y);
        const yMax = MyMath.clamp(center.y+radius, min.y, max.y);

        for(let y=yMin; y<=yMax; ++y) {

            for(let x=xMin; x<=xMax; ++x) {
                const arcPoint = temp1.assign(x,y);                        // arcPoint = (x,y)
                const sqrDist  = arcPoint.sub(center, temp2).sqrMagnitude; // sqrDist  = |arcPoint-center|^2

                if(sqrDist <= sqrRadius) {

                    if(!fill && sqrDist < sqrRadius1) { // fill = false 라면, 원의 가장자리의 점들만 그려낸다.
                        continue;                       // 고로 center 에서 (radius-1) 보다 작게 떨어져있는 점들은 무시한다.
                    }
                    Renderer.setPixel(arcPoint, color);
                }
            }
        }
    }


    /** 현재 카메라의 평면에 최솟점으로 min, 최댓점으로 max 를 갖는 사각형을 그립니다.
     * 
     *  min, max 는 항상 스크린 좌표(screen coordinate)이어야 합니다. wireFrameMode = true 를
     * 
     *  전달한다면 사각형의 픽셀을 채우는 대신, 선을 그어 그립니다. */
    static drawCube2D(min, width, height, color, wireFrameMode=false) {
        const max = Renderer.#temp0.assign(min.x+width, min.y+height);

        for(let y=min.y; y<max.y; ++y) {

            for(let x=min.x; x<max.x; ++x) {
                const point = Renderer.#temp1.assign(x,y);
                Renderer.setPixel(point, color);
            }
        }
    }


    /** 현재 카메라의 평면에 선분 from-to 를 그립니다. from, to 는 항상 월드 좌표(world coordinate)이어야 합니다.
     * 
     *  기본으로 선분이 카메라 영역을 벗어나지 않도록 클리핑(clipping)을 수행하지만, clipLine = false 를 넘기는 것으로
     * 
     *  이 과정을 생략할 수 있습니다. 또한 debug = true 를 넘겨 선분이 어떻게 클리핑되었는지를 확인할 수 있습니다. */
    static drawLine2D(from, to, color, clipLine=true, debug=false) {
        const camera = Renderer.camera;

        if(debug) {
            Renderer.drawArc2D(from, 2, Color.red, true);
            Renderer.drawArc2D(to, 2, Color.blue, true);
            GameEngine.drawText("from", camera.worldToScreen(from));
            GameEngine.drawText("to", camera.worldToScreen(to));
            Renderer.drawLine2D(from, to, new Color(255, 0, 0, 30), false, false);
        }
        from = camera.worldToScreen(from, Renderer.#temp0);
        to   = camera.worldToScreen(to, Renderer.#temp1);

        if(clipLine && !camera.clipLine(from,to)) {
            return;
        }
        const w  = Math.abs(to.x - from.x);
        const h  = Math.abs(to.y - from.y);
        const w2 = 2*w;
        const h2 = 2*h;

        const dirX = MyMath.sign(to.x - from.x);
        const dirY = MyMath.sign(to.y - from.y);

        if(w > h) {
            let d = (2*h - w); // d = (2·h - w)

            for(let i=0; i<=w; ++i) {
                Renderer.setPixel(from, color);

                if(d >= 0) {
                    d      -= w2;
                    from.y += dirY;
                }
                d      += h2;
                from.x += dirX;
            }
        }

        else {
            let d = (2*w - h); // d = (2·w - h)

            for(let i=0; i<=h; ++i) {
                Renderer.setPixel(from, color);

                if(d >= 0) {
                    d      -= h2;
                    from.x += dirX;
                }
                d      += w2;
                from.y += dirY;
            }
        }
    }


    /** 현재 카메라의 평면에 vertex0-vertex1-vertex2 를 정점(Vertex)으로 하는 삼각형(Triangle)을 그립니다. 
     * 
     *  triangle 을 구성하는 vertex0, vertex1, vertex2 는 항상 월드 좌표(world coordinate)이어야 합니다. */
    static drawTriangle2D(triangle, material=Shader.DEFAULT_MATERIAL) {
        const camera  = Renderer.camera;

        const vertex0 = triangle.vertex0;
        const vertex1 = triangle.vertex1;
        const vertex2 = triangle.vertex2;

        const pos0 = vertex0.position;
        const pos1 = vertex1.position;
        const pos2 = vertex2.position;

        if(material.usePerspective) {          // usePerspective = true 라면, 원근투영을 사용했으므로 삼각형은 clip 좌표이다.
            camera.clipToViewport(pos0, pos0); // NDC 좌표로 변환 후, 카메라의 해상도를 곱해주어서 결과를 화면에 채워준다.
            camera.clipToViewport(pos1, pos1); // clipToViewport() 함수는 특별히 클립좌표의 1/w 값을 보존한다.
            camera.clipToViewport(pos2, pos2);
        }
        if(material.wireFrameMode) {               // wireFrameMode = true 라면, 삼각형의 픽셀을 채우지 않고
            const color = material.wireFrameColor; // 선으로만 삼각형을 그린다.

            Renderer.drawLine2D(pos0, pos1, color); // 선분 p0-p1 을 그린다.
            Renderer.drawLine2D(pos1, pos2, color); // 선분 p1-p2 를 그린다.
            Renderer.drawLine2D(pos2, pos0, color); // 선분 p2-p0 을 그린다.
            return;
        }
        const p0 = camera.worldToScreen(pos0, Renderer.#temp0); // #temp0 = camera.worldToScreen(vertex0.position);
        const p1 = camera.worldToScreen(pos1, Renderer.#temp1); // #temp1 = camera.worldToScreen(vertex1.position);
        const p2 = camera.worldToScreen(pos2, Renderer.#temp2); // #temp2 = camera.worldToScreen(vertex2.position);

        const xMin = Math.min(p0.x, p1.x, p2.x);
        const xMax = Math.max(p0.x, p1.x, p2.x);
        const yMin = Math.min(p0.y, p1.y, p2.y);
        const yMax = Math.max(p0.y, p1.y, p2.y);

        const u = p0.assign(p0.x-p2.x, p0.y-p2.y); // u = p0-p2
        const v = p1.assign(p1.x-p2.x, p1.y-p2.y); // v = p1-p2

        const uu = (u.x*u.x) + (u.y*u.y); // uu = u · u
        const vv = (v.x*v.x) + (v.y*v.y); // vv = v · v
        const uv = (u.x*v.x) + (u.y*v.y); // uv = u · v

        let div = uv*uv - uu*vv; // div = (uv^2 - uu·vv)

        if(div == 0) { // 퇴화 삼각형이라면 삼각형은 그릴 수 없다.
            return;    // div 는 항상 정수(integer)이므로 0 과 비교해도 문제 없다.
        }
        div = 1 / div; // 여러번 사용되므로, 곱셈의 형태로 바꾸기 위해 역수를 취한다.

        for(let y=yMin; y<=yMax; ++y) {

            for(let x=xMin; x<=xMax; ++x) {
                const w  = Renderer.#temp3.assign(x,y);  // w  = (p0·s) + (p1·t) + (p2·(1-s-t)) 
                const p  = w.assign(w.x-p2.x, w.y-p2.y); // p  = (w-p2)
                const pu = (p.x*u.x) + (p.y*u.y);        // pu = (p · u)
                const pv = (p.x*v.x) + (p.y*v.y);        // pv = (p · v)

                let s  = (pv*uv - pu*vv) * div; // s = (pv·uv - pu*vv) / (uv^2 - uu·vv)
                let t  = (pu*uv - pv*uu) * div; // t = (pu*uv - pv*uu) / (uv^2 - uu·vv)
                let t2 = (1-s-t);               // t2 = (1-s-t)

                if((0 <= s) && (s <= 1) && (0 <= t) && (t <= 1) && (0 <= t2) && (t2 <= 1)) {
                    const point   = w.assign(x,y);
                    const color   = Renderer.#color0;
                    const vertex3 = Renderer.#vertex3;

                    if(material.zTest) {                                       // zTest = true 라면, 깊이 테스트를 진행한다.
                        const z = (pos0.z * s) + (pos1.z * t) + (pos2.z * t2); // (pos0·s) + (pos1·t) + (pos2·(1-s-t)) 

                        if(Renderer.zTest(point, z) == false) { // depthBuffer.z 가 더 카메라와 가깝다면,
                            continue;                           // setPixel() 을 스킵한다.
                        }
                    }
                    if(material.usePerspective) {                           // usePerspective = true 라면, 
                        const invW = 1 / (s*pos0.w + t*pos1.w + t2*pos2.w); //

                        s  *= invW * pos0.w;
                        t  *= invW * pos1.w;
                        t2 *= invW * pos2.w;
                    }

                    vertex3.uv.x   = (vertex0.uv.x*s) + (vertex1.uv.x*t) + (vertex2.uv.x*t2);
                    vertex3.uv.y   = (vertex0.uv.y*s) + (vertex1.uv.y*t) + (vertex2.uv.y*t2);
                    vertex3.normal = vertex0.normal;
                    
                    material.fragmentShader(vertex3, color, material); // 픽셀 셰이더를 거치고, 최종 색상을 얻어온다.
                    Renderer.setPixel(point, color);                   // setPixel 함수로 point 에 위치한 픽셀을 찍는다.
                }
            }
        }
    }
}



/** 점 p 가 NDC 공간의 우측 평면 안에 있는지 검사합니다. */
export function testRight(p) { return (p.x <= p.w) ? 1 : 0; }


/** 점 p 가 NDC 공간의 좌측 평면 안에 있는지 검사합니다. */
export function testLeft(p) { return (-p.w <= p.x) ? 1 : 0; }


/** 점 p 가 NDC 공간의 상단 평면 안에 있는지 검사합니다. */
export function testTop(p) { return (p.y <= p.w) ? 1 : 0; }


/** 점 p 가 NDC 공간의 하단 평면 안에 있는지 검사합니다. */
export function testBottom(p) { return (-p.w <= p.y) ? 1 : 0; }


/** 점 p 가 NDC 공간의 원평면 안에 있는지 검사합니다. */
export function testFar(p) { return (p.z <= p.w) ? 1 : 0; }


/** 점 p 가 NDC 공간의 근평면 안에 있는지 검사합니다. */
export function testNear(p) { return (-p.w <= p.z) ? 1 : 0; }



/** 선분 vertex0-vertex1 을 NDC 공간의 우측평면에 맞도록 잘라줍니다. */
export function clipRight(vertex0, vertex1, out) {
    const x0 = vertex0.position.x;
    const x1 = vertex1.position.x;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = (w0-x0) / (x1-x0-w1+w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}


/** 선분 vertex0-vertex1 을 NDC 공간의 좌측평면에 맞도록 잘라줍니다. */
export function clipLeft(vertex0, vertex1, out) {
    const x0 = vertex0.position.x;
    const x1 = vertex1.position.x;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = -(w0+x0) / (x1-x0+w1-w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}


/** 선분 vertex0-vertex1 를 NDC 공간의 상단평면에 맞도록 잘라줍니다. */
export function clipTop(vertex0, vertex1, out) {
    const y0 = vertex0.position.y;
    const y1 = vertex1.position.y;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = (w0-y0) / (y1-y0-w1+w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}


/** 선분 vertex0-vertex1 을 NDC 공간의 하단평면에 맞도록 잘라줍니다. */
export function clipBottom(vertex0, vertex1, out) {
    const y0 = vertex0.position.y;
    const y1 = vertex1.position.y;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = -(w0+y0) / (y1-y0+w1-w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}


/** 선분 vertex0-vertex1 을 NDC 공간의 근평면에 맞도록 잘라줍니다. */
export function clipNear(vertex0, vertex1, out) {
    const z0 = vertex0.position.z;
    const z1 = vertex1.position.z;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = -(w0+z0) / (z1-z0+w1-w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}


/** 선분 vertex0-vertex1 을 NDC 공간의 원평면에 맞도록 잘라줍니다. */
export function clipFar(vertex0, vertex1, out) {
    const z0 = vertex0.position.z;
    const z1 = vertex1.position.z;
    const w0 = vertex0.position.w;
    const w1 = vertex1.position.w;

    const s = (w0-z0) / (z1-z0-w1+w0);

    Vector4.lerp(vertex0.position, vertex1.position, s, out.position); // out.position = (pos0·(1-s) + pos1·s)
    Vector2.lerp(vertex0.uv, vertex1.uv, s, out.uv);                   // out.uv       = (uv0·(1-s) + uv1·s) 
    out.normal = vertex0.normal;                                       // out.normal   = normal0
}