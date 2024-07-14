## Overview

게임 수학을 공부하기 위해 만든 간단한 렌더러 프로젝트입니다. "이득우의 게임수학" 을 참고하였습니다. <br>
javascript 의 CanvasRenderingContext2D API 를 사용하되, 주로 `fillRect`, `clearRect` 만을 사용하여 <br>
GPU 의 렌더링 파이프라인을 단순하게 구현합니다. <br>

책과 달리 C++ 을 사용하지 않은 이유는 수학에만 집중하기 위해서입니다. 덕분에 `requestAnimationFrame` 으로 <br>
간단하게 `deltaTime`, `update` 를 구현할 수 있었고, `canvas` 를 통해 간단하게 그리기 연산을 제출할 수 있었지만 <br>
바닐라JS 인지라 타입 검사가 없어 버그의 원인 파악과 클래스 작성이 조금 난감했습니다. 

여기서 어이 없던 것이 private 관련 문법이었는데, 예를 들어, 다음과 같이 클래스 `Transform` 을 작성한다고 할 때:

``` js
class Transform {
  #a;             // private member.
  #parent = null; // Transform 타입의 부모를 가리키는 참조변수. 비어있을때는 null
};
```
C++ 로 생각하면 `Transform* parent = null` 과 같은 개념으로 쓰려고 했는데... 자바 스크립트는 타입을 알 수가 없는지라.. <br>
기본적으로 `this.#parent.#a` 처럼 접근할 수가 없었습니다. 이게 실행할 때는 문제 없이 실행되지만.. visual studio code 에서는 <br>
저게 `private` 멤버라 접근할 수 없다고 합니다. 그래서 `const parent = this.#parent; parent.#a;` 처럼 해봤는데, <br>
신기하게 이건 또 문법 에러가 아니라고 합니다;

이거 말고도 연산자 오버로딩(operator overloading)이 없던게 제일 불편했습니다. 그래서 `Vector3` 같은 클래스는 벡터 간의 덧셈을
``` js
const u = Vector3.up;
const v = Vector3.right;
const w = new Vector3(1,1,1);

const result0 = u.add(v,w);       // u + v + w
const result1 = u.add(v.sub(w) ); // u + (v-w)
```
이렇게 해야 했던게 진짜 아니었던;; 이런거 보면 C++ 이 그리워지지만, 이런 특징들을 포기했을 때의 편의성이 너무 좋았기에<br>
수학에 집중하기 위해 JS 를 선택하게 되었습니다. <br>

`Math.js` 모듈에는 `Vector3`, `Matrix4x4`, `Frustum` 을 포함한 모든 수학 관련 클래스 및 함수들이 정의되어 있으며, <br>
`GameEngine.js` 에는 `GameEngine`, `Transform`, `CircleCollider`, `Bone` 등이 정의되어 있습니다. <br>
마지막으로 `Renderer.js` 에는 `Renderer`, `Texture`, `Mesh` 등이 정의되어 있습니다. <br>
아직 사원수나 본의 가중치를 구현하지 않았으며, 이는 나중에 추가할 예정입니다.

**EDIT 24/03/05**: 가중치 적용 추가

**EDIT 24/07/13**: 후면 버퍼 추가. 퍼포먼스 향상

**EDIT 24/7/15**: Bone.skeletal() 함수는 transform 에 변동이 없으면, 결과를 캐싱하여 사용하도록 함. 또한 depthBuffer 가 매프레임마다 재할당되는 것을 막음.

<br>
<br>

## Example

여기서는 `main.js` 의 내용을 간략하게 설명합니다. 위에서도 언급했듯이, 각 클래스들의 기능이 완벽한 것은 아닙니다. <br>
그래도 편의를 위해 간략하게는 구현해봤습니다: 

``` js
GameEngine.canvas = document.getElementById("canvas");       // 캔버스를 게임 엔진에 등록한다.
GameEngine.setResolution(480, 270);                          // 캔버스의 해상도를 설정
Camera.mainCamera.screenSize = GameEngine.getResolution();   // 메인 카메라의 화면 크기를 설정
```
이 프로젝트에서는 디스플레이 출력 장치를 모니터(monitor)가 아니라 캔버스(canvas)라고 생각합니다. <br>
고로, 렌더링을 시작하기 전에 `GameEngine.canvas` 속성에 `canvas` 를 등록해야 합니다. <br>
또한, 캔버스의 해상도를 결정해야 하며, 이는 `GameEngine.getResolution` 을 통해 수행합니다.

마지막 줄에서 `mainCamera.screenSize` 를 설정하는데, 이것은 메인 카메라가 캔버스에서 <br>
어느 정도의 영역을 사용할지 결정합니다. 여기서는 `GameEngine.getResolution` 을 주는 것으로 <br>
캔버스의 전체 영역, 즉 화면 전체를 사용하도록 합니다.


``` js
const steve     = GameObject.instantiate(); // 새로운 게임오브젝트를 생성한다.
const steveMesh = new Mesh();               // 매시 생성
const steveTex  = new Texture("./resource/steve3d.png", GameEngine.initialize); // 텍스쳐 생성.
const steveMat  = steve.renderer.material = new Material();                     // 머터리얼 생성.

steveMat.mainTex    = steveTex;  // 머터리얼에 텍스쳐를 등록
steve.renderer.mesh = steveMesh; // 렌더러에 메시를 등록

steveMesh.vertices = [ /* 생략 */ ]; // 정점(vertex)들의 목록을 메시에 등록
steveMesh.uvs      = [ /* 생략 */ ]; // UV 좌표들의 목록을 메시에 등록
steveMesh.indices  = [ /* 생략 */ ]; // 인덱스 버퍼를 등록. 

steveMat.triangleCount = steveMesh.indices.length / 6; // 머터리얼이 영향을 미칠 삼각형의 갯수를 알려준다.
steveMesh.collider     = new BoxCollider(steveMesh);   // 바운딩 볼륨. 절두체 컬링에 사용됩니다.

// 본(Bone)들을 생성
const pelvis   = new Bone(new Vector3(0, -1, 0) );     // 골반
const rightArm = new Bone(new Vector3(1.5, 1.5, 0) );  // 우측팔
const leftArm  = new Bone(new Vector3(-1.5, 1.5, 0) ); // 좌측팔
const leftLeg  = new Bone(new Vector3(-0.5, -1, 0) );  // 좌측다리
const rightLeg = new Bone(new Vector3(0.5, -1, 0) );   // 우측다리
const spine    = new Bone();                           // 척추
const neck     = new Bone(new Vector3(0, 2, 0) );      // 목

// 본의 계층구조:
//
// ㄴpelvis
//     ㄴleftLeg
//     ㄴrightLeg
//     ㄴspine
//        ㄴneck
//        ㄴleftArm
//        ㄴrightArm

rightArm.parent = spine;
leftArm.parent  = spine;
neck.parent     = spine;

leftLeg.parent  = pelvis;
rightLeg.parent = pelvis;
spine.parent    = pelvis;

const leftArmWeight  = new Weight(["LeftArm"], [1]);
const rightArmWeight = new Weight(["RightArm"], [1]);
const leftLegWeight  = new Weight(["LeftLeg"], [1]);
const rightLegWeight = new Weight(["RightLeg"], [1]);
const neckWeight     = new Weight(["Neck"], [1]);
const pelvisWeight   = new Weight(["Pelvis"], [1]);
const spineWeight    = new Weight(["Spine"], [1]);

steveMesh.bones = [ /* 생략 */ ];
steveMesh.weights = [ /* 생략 */ ];
steve.update = ()=>{ /* 생략 */ };
```
다음으로 `GameObject` 를 생성해야 합니다. `GameObject` 를 생성하려면 `GameObject.instantiate` <br>
를 호출하면 됩니다. 모든 `GameObject` 는 필수적으로 `Renderer` 인스턴스를 하나씩 가지고 있습니다. <br>

`Renderer` 클래스는 `Camera.mainCamera` 의 정보를 바탕으로 주어진 `Mesh` 를 렌더링 하는 역할을 수행합니다. <br>
이는 `Renderer.drawMesh` 함수를 호출하여 수행하며, 이를 드로콜(draw call)이 발생했다고 합니다. <br>
즉, 렌더링 파이프 라인의 과정은 해당 함수에서 진행됩니다. 다만, 해당 함수는 `GameEngine.initialize` 를 호출한 후 <br>
에는 `GameEngine` 에서 자동으로 호출해주므로 직접 호출할 필요가 없습니다.

여기서 `GameEngine.initialize` 를 `Texture` 의 생성자에 넘겨주고 있는데, 이는 텍스처가 전부 로드가 되면 <br>
호출될 콜백을 등록하는 것입니다. 일반적으로 자바스크립트에서 이미지를 로드하는 방식이 비동기 식으로 처리되기에 <br>
이미지가 다 로드될 때까지 기다리게 하는 것이 많이 불편합니다. 그렇다고, 이렇게 하지 않으면 이미지가 언제 로드가 <br>
완료되는지를 알 수가 없습니다. 그렇기에 여러 `Texture` 들을 로드해야 한다면:

``` js
let mainTex, subTex;

mainTex = new Texture("./main_texutre.png", ()=>{
  subTex = new Texture("./sub_texture.png", GameEngine.initialize);
});
```
처럼 차례차례로 수행한 후, 마지막 텍스처 로드가 완료되었을 때, `GameEngine.initialize` 를 호출시키게 해야 합니다. <br>
좋은 디자인은 아니지만(poor design), 해당 프로젝트에서는 이미지 파일 하나만 불러오면 되므로, 이 부분은 넘어가기로 했습니다. <br>

`GameObject` 는 `update` 를 등록할 수 있으며, 등록한 콜백함수를 매 프레임마다 호출되도록 합니다. <br>
여기 예제에서는 `GameEngine.getKeyDown` 등의 함수를 통해, 스티브의 트랜스폼을 갱신하고, <br>
본을 움직이는 것으로 스켈레탈 애니메이션을 수행하도록 합니다. 나머지 부분들은 전부 초기화 코드에 해당합니다.

정점과 UV 좌표의 인덱스는 첨부된 그림을 참고하면 됩니다: <br>
<img width=500 height=500 src="https://github.com/teumal/rendererJS/blob/main/%EC%A0%95%EC%A0%90%20%EB%B2%88%ED%98%B8.png?raw=true">
<img width=500 height=500 src="https://github.com/teumal/rendererJS/blob/main/uv%20%EC%A2%8C%ED%91%9C.png?raw=true"><br>
인덱스 버퍼에는 삼각형 하나를 이루는 세 점에서 사용할 정점과 인덱스를 연속적으로 배치해둡니다:

``` js
steveMesh.indices = [
    0,1,3,  0,1,3, // 정면0, vertex0, vertex1, vertex2, uv0, uv1, uv2
    1,2,3,  1,2,3, // 정면1, vertex0, vertex1, vertex2, uv0, uv1, uv2
];
```
특이하게 삼각형을 하나를 그리기 위해서는 6개의 인덱스가 필요합니다. 그렇기에 모델링 파일을 렌더링하고 싶다면, <br>
이 사실에 유의하여 렌더러와 호환되도록 js 파일을 작성해야 합니다.

이때, 나열한 점들의 순서가 시계방향인지 반시계방향인지에 따라서 `backface culling` 를 적용할 수 있습니다. <br>
물론, `Renderer.backfaceCulling` 속성을 설정하여 할지 안할지 여부 또한 결정 가능합니다. <br>
최종 결과는 아래와 같습니다. `Mesh.boneVisible = true` 를 통해 본이 어떻게 되었는지 또한 보이도록 했습니다: <br>
<img src="https://github.com/teumal/rendererJS/blob/main/%EC%98%88%EC%A0%9C%20%EA%B2%B0%EA%B3%BC.JPG?raw=true">
<img src="https://postfiles.pstatic.net/MjAyNDA3MTVfNTMg/MDAxNzIwOTc3OTY3NzQy.cAPaXfobqYAo7eiBAL43YdXTThCHb72bb3lSoUSrZakg.HrVovdtO0dXEy3DLaVQXqY5zNWSiAiY5sBxHE3rhRGsg.JPEG/%EC%BA%A1%EC%B2%98.JPG?type=w773">
## Example2

이번 예제는 PMX (MikuMikuDance) 파일을 읽어들여, 다크소울의 보스인 **Sif, the GreatWolf** 를 렌더링합니다 <br>
읽어들이는 과정에 대해서는 [Sif, the Greatwolf 렌더링](https://blog.naver.com/zmsdkemf8703/223367387865) 를 참고하시길 바랍니다. <br>
여기서는 `Material` 에 대해 기술합니다. 머터리얼이 추가되면서, 이제 `GameObject` 생성후, 렌더러에 머터리얼을 주지 않으면 <br>

``` js
#vertexShader   = (vertex, finalMat)=>{ return finalMat.mulVector(vertex); }; // 디폴트 정점 셰이더
#fragmentShader = (uv, pos)=>{ return new Color(255, 0, 221,1); };            // 디폴트 픽셀 셰이더
```
정점셰이더는 `finalMat` 를 적용하고, 픽셸 셰이더는 핑크색을 돌려주는 기본동작을 수행합니다. <br>
고로 텍스쳐를 입히기 위해서는 `Material` 인스턴스를 생성한뒤, `renderer.material` <br>
속성을 사용하여 넣어주어야 합니다:

``` js
sif.renderer.material = new Material();
sif.renderer.material.triangleCount = sifMesh.triangleCount;
```
생성한 머터리얼은 `mainTex` 속성을 가지고 있으며, `Renderer.tex2D` 를 사용하여 메인 텍스쳐를 렌더링 하는 코드를 <br>
가지고 있습니다. 머터리얼은 항상 `triangleCount` 에 영향을 끼칠 삼각형의 갯수를 설정해주어야 합니다. <br>
이는 `materials` 을 사용해 서브 메시를 사용할때 사용됩니다. <br>

위 예제에서 캐릭터는 3개의 머터리얼을 사용합니다. 고로, 아래와 같이 해줍니다:
``` js
const mat0 = new Material(); 
const mat1 = new Material(); 
const mat2 = new Material(); 

mat0.triangleCount = 2928  / 3; 
mat1.triangleCount = 14436 / 3;
mat2.triangleCount = 21204 / 3;

sif.renderer.materials = [mat0, mat1, mat2]; // 서브메시 사용
```
각 머터리얼들의 `triangleCount` 는 `Mesh.indices` 인덱스 버퍼의 각 삼각형들의 순서와 일치합니다. <br>
고로, `mat0` 은 0 번째부터 978 번 삼각형까지 사용되며, `mat1` 은 979 번째 부터 5,791 번째 삼각형까지 사용됩니다. <br>

<img src="https://postfiles.pstatic.net/MjAyNDAyMjdfMSAg/MDAxNzA5MDM0NjgxMjUx.eRJSpHptCg87MaLSzZS2nT1VfkCTEckxYDs-lYFtjzIg.O3pjc4F38Bfe52d-gCltpzCQlmSwh_uFrQ0-bz_uorsg.JPEG/%EB%86%80%EB%9E%80_%EC%8B%9C%ED%94%84.JPG?type=w773">
<img src="https://postfiles.pstatic.net/MjAyNDAyMjdfMjMg/MDAxNzA5MDM0Njc0MDE2.iBJnmDzHr6dUDMhdEzduym46rMAssBOntQB062g4VDIg.5-GFU3fdTp9gXmKD-CPtT9D8kG_Nl0FH9x8bbNieur4g.JPEG/%EC%8B%9C%ED%94%84_%EB%B3%B8.JPG?type=w773">

스켈레탈 애니메이션의 경우, 애니메이션 그래프 등은 없고 대신 `update` 에서 `Math.sin` 등의 함수를 사용하여 <br>
직접 구현해줄 수 있습니다:

``` js
const rightArm = sifMesh.bones["Bip01-R-Clavicle01"];
const leftArm  = sifMesh.bones["Bip01-L-Clavicle01"];
const tail     = sifMesh.bones["tail 1"];
const rightLeg = sifMesh.bones["Bip01-R-Calf01"];
const leftLeg  = sifMesh.bones["Bip01-L-Calf01"];

const tailRotation     = Transform.toEuler(tail.localRotation);
const rightArmRotation = Transform.toEuler(rightArm.localRotation);
const leftArmRotation  = Transform.toEuler(leftArm.localRotation);
const rightLegRotation = Transform.toEuler(rightLeg.localRotation);
const leftLegRotation  = Transform.toEuler(leftLeg.localRotation);
let   rad              = 0;

sif.update = ()=>{
   // ...omitted..

   // skeletal animation
    const angle = Math.sin(rad += deltaTime*Math.PI) * 45;

    tailRotation.y = angle;
    rightArmRotation.x = angle;
    leftArmRotation.x = -angle;
    leftLegRotation.x = angle;
    rightLegRotation.x = -angle;

    leftArm.transform.localRotation = leftArmRotation;
    rightArm.transform.localRotation = rightArmRotation;
    leftLeg.transform.localRotation = leftLegRotation;
    rightLeg.transform.localRotation = rightLegRotation;
    tail.transform.localRotation = tailRotation;
};
```
<img src="https://postfiles.pstatic.net/MjAyNDAzMDRfMjg0/MDAxNzA5NTI5NDI3OTg5.5-MrNU9KLpyfnu_kA5qHfaNw6VEy59MLXBdeVSctSG8g.YX2qfCm4g5He4oL179huryTFgiGz4p7iLw_w2ufDEWUg.JPEG/%EC%BA%A1%EC%B2%98.JPG?type=w773">
