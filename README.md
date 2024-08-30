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

**EDIT 24/7/17**: Renderer.drawMesh 함수 최적화. 퍼포먼스 향상. 프레임이 많이 안정화됨

**EDIT 24/7/18**: testOrigin, clipOrigin 함수 삭제. 이 프로젝트에서 zNear 는 항상 0보다 크다고 가정하기 때문. 결과적으로 캐릭터가 카메라와 근접했을 때, 약간의 성능 증가. 
MyMath 에 NonAlloc 버전의 함수들을 추가. 

**EDIT 24/7/29**: Quaternion 클래스 추가. 잡다한 버그 수정. 이후 "fbx.h" 와 Animator 등이 추가될 예정.

**EDIT 24/8/30**: AnimationState, AnimationCurve, RotationOrder 등 fbx.h 를 위한 다양한 기능이 추가되었습니다. 이 기능들이 모두 완성된 것은 아니지만, 중간 커밋을 위해
업데이트 합니다. 사용법에 대한 설명은 아래 Example 을 참고하시길 바랍니다. 또한 Transform.invTRSNonAlloc 에서 Quaternion.conjugateNonAlloc 이 잘못되는 버그가
수정되었습니다.

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

## Example3

세번째 예제는 원신의 리사(丽莎)를 렌더링합니다. 여기서는 C++ 로 PMX 파일을 읽고, rendererJS 와 호환되는 js 파일을 써주는 <br>

`pmx.h` 헤더파일을 간단히 소개합니다. 먼저 `pmx.h` 를 다운받으시고, 아래 코드를 작성해주시길 바랍니다:

``` c++
// main.cpp
// compiled in MSVC
# include<iostream>
# include<fstream>
# include"pmx.h"

int main() {
   const char* file_name0 = "./lisa.pmx";
   const char* file_name1 = "./result.js";
   const char* file_name2 = "./result.log";

   std::ofstream out0(file_name1);
   std::ofstream out1(file_name2);
   pmx::out = &out1;

   pmx::read(file_name0);
   pmx::printjs("lisa", out0);
}
```
사용법은 아주 간단합니다. 먼저 `pmx::read()` 함수를 사용하여, PMX 파일을 읽어들입니다. <br>
`pmx::read()` 은 모델링 파일의 정보를 `(*pmx::out)` 으로 출력합니다. <br>
기본값은 `&std::cout` 이며, 위 예제에서는 `result.log` 로 출력하기 위해 `&out1` 으로 초기화해주었습니다. <br><br>

다음 `pmx::printjs()` 함수를 호출하여, js 파일을 작성합니다. 첫번째 인자는 짓고 싶은 `gameObject` 의 이름이며, <br>
만들어진 파일은 아래와 같은 형식을 가집니다:

``` js
// result.js
import {GameEngine, Transform, Camera, GameObject, CircleCollider, BoxCollider, KeyCode, Bone} from "./GameEngine.js";
import {Vector2, Vector3, Vector4} from "./MyMath.js";
import * as MyMath from "./MyMath.js";
import {Renderer, Texture, Mesh, Weight, Color, Material} from "./Renderer.js";

GameEngine.canvas = document.getElementById("canvas");
GameEngine.setResolution(480, 270);
Camera.mainCamera.screenSize = GameEngine.getResolution();

const lisa     = GameObject.instantiate();
const lisaMesh = lisa.renderer.mesh = new Mesh();

lisaMesh.vertices = [ /* 생략 */ ];
lisaMesh.indices = [ /* 생략 */ ];
lisaMesh.uvs = [ /* 생략 */ ];

const lisaMat0 = new Material();
const lisaMat1 = new Material();
const lisaMat2 = new Material();
const lisaMat3 = new Material();
const lisaMat4 = new Material();
const lisaMat5 = new Material();
const lisaMat6 = new Material();
const lisaMat7 = new Material();
const lisaMat8 = new Material();
const lisaMat9 = new Material();
const lisaMat10 = new Material();
const lisaMat11 = new Material();
const lisaMat12 = new Material();
const lisaMat13 = new Material();

lisaMat0.triangleCount = 196;
lisaMat1.triangleCount = 1234;
lisaMat2.triangleCount = 1034;
lisaMat3.triangleCount = 1816;
lisaMat4.triangleCount = 2861;
lisaMat5.triangleCount = 610;
lisaMat6.triangleCount = 1938;
lisaMat7.triangleCount = 844;
lisaMat8.triangleCount = 1002;
lisaMat9.triangleCount = 3806;
lisaMat10.triangleCount = 1524;
lisaMat11.triangleCount = 840;
lisaMat12.triangleCount = 8776;
lisaMat13.triangleCount = 442;

lisa.renderer.materials = [lisaMat0, lisaMat1, lisaMat2, lisaMat3, lisaMat4, lisaMat5, lisaMat6, lisaMat7, lisaMat8, lisaMat9, lisaMat10, lisaMat11, lisaMat12, lisaMat13];

let lisaTex0 = null;
let lisaTex1 = null;
let lisaTex2 = null;
let lisaTex3 = null;

lisaMesh.bones = { /* 생략 */ };

//#region Bone Hierarchy

  lisaMesh.bones["unnamed27"].parent = lisaMesh.bones["unnamed26"]
	lisaMesh.bones["groove"].parent = lisaMesh.bones["unnamed27"]
	lisaMesh.bones["waist"].parent = lisaMesh.bones["groove"]
  /* 생략 */

//#endregion

lisaMesh.weights = [ /* 생략 */ ];

lisaMesh.collider           = new BoxCollider(lisaMesh);
lisaMesh.boneVisible        = false;
lisa.renderer.wireFrameMode = false;

let rotation = Vector3.zero;
let position = lisa.transform.position = new Vector3(0,0,8);

// update function example
lisa.update = ()=>{
	const deltaTime     = GameEngine.deltaTime;
	const rotSpeed      = deltaTime * 360;
	const moveSpeed     = deltaTime * 40;
	let   rotationDirty = false;
	let   positionDirty = false;

	if(GameEngine.getKeyUp(KeyCode.Alpha1)) lisa.renderer.wireFrameMode = !lisa.renderer.wireFrameMode;
	if(GameEngine.getKeyUp(KeyCode.Alpha2)) lisaMesh.boneVisible        = !lisaMesh.boneVisible;

	if (GameEngine.getKey(KeyCode.Left))  { rotation.y += rotSpeed; rotationDirty = true; }
	if (GameEngine.getKey(KeyCode.Right)) { rotation.y -= rotSpeed; rotationDirty = true; }
	if (GameEngine.getKey(KeyCode.Up))    { rotation.x += rotSpeed; rotationDirty = true; }
	if (GameEngine.getKey(KeyCode.Down))  { rotation.x -= rotSpeed; rotationDirty = true; }

	if (GameEngine.getKey(KeyCode.W)) { position.z += moveSpeed; positionDirty = true; }
	if (GameEngine.getKey(KeyCode.S)) { position.z -= moveSpeed; positionDirty = true; }
	if (GameEngine.getKey(KeyCode.A)) { position.y -= moveSpeed; positionDirty = true; }
	if (GameEngine.getKey(KeyCode.D)) { position.y += moveSpeed; positionDirty = true; }

	if(positionDirty) {
		lisa.transform.position = position;
	}
	if(rotationDirty) {
		lisa.transform.localRotation = rotation;
	}
	GameEngine.drawText(`deltaTime: ${deltaTime}`, 20, 20);
	GameEngine.drawText(`position : ${position}`, 20, 30);
	GameEngine.drawText(`rotation : ${rotation}`, 20, 40);
	GameEngine.drawText(`boneVisible : ${lisaMesh.boneVisible}`, 20, 50); 
	GameEngine.drawText(`wireFrameMode : ${lisa.renderer.wireFrameMode}`, 20, 60);
};

lisaTex0 = new Texture("./resource/Texture\头发.png", ()=>{
	lisaTex1 = new Texture("./resource/Texture\脸.png", ()=>{
		lisaTex2 = new Texture("./resource/Texture\衣服.png", ()=>{
			lisaTex3 = new Texture("./resource/Texture\表情.png", ()=>{
				lisaMat0.mainTex = lisaTex0;
				lisaMat1.mainTex = lisaTex1;
				lisaMat2.mainTex = lisaTex2;
				lisaMat3.mainTex = lisaTex1;
				lisaMat4.mainTex = lisaTex0;
				lisaMat5.mainTex = lisaTex0;
				lisaMat6.mainTex = lisaTex0;
				lisaMat7.mainTex = lisaTex2;
				lisaMat8.mainTex = lisaTex2;
				lisaMat9.mainTex = lisaTex2;
				lisaMat10.mainTex = lisaTex2;
				lisaMat11.mainTex = lisaTex2;
				lisaMat12.mainTex = lisaTex2;
				lisaMat13.mainTex = lisaTex3;
				GameEngine.initialize();
			});
		});
	});
});

```
해당 파일은 `pmx::printjs()` 인자에 `"lisa"` 를 주었기에, 모두 `lisaMat`, `lisaTex` 와 같은 이름을 가지고 있습니다 <br>
또한 `lisa.update` 에 간단한 예제가 포함되어 있습니다. 사용법은 아래와 같습니다:

- W,S : z 축 이동
- A,D : y 축 이동
- ←,→ : yaw 회전 (=y axis)
- ↑,↓ : pitch 회전 (=x axis)
- 1 : toggle `wireFrameMode`
- 2 : toggle `boneVisible`

위 코드를 보면 `Texture` 생성자에 줄 파일의 경로가 잘못됨을 알 수 있는데, 이런 부분들은 직접 수정하셔야 합니다. <br>
최종 결과는 다음과 같습니다:

<img src="https://postfiles.pstatic.net/MjAyNDA3MTdfMjYz/MDAxNzIxMTU5NDAyOTQx.3J5FDyIHstOSssipVtyV4eMHskkSd1EwsdfCZLki0iUg.YhqQbWzoJB6s6UOBf-pMD2lqrdCyhynsbTqxJyzDlIgg.JPEG/%EC%BA%A1%EC%B2%98.JPG?type=w3840">

## Example4

이번 예제는 새롭게 추가된 `AnimationState`, `AnimationCurve` 클래스들을 간단하게 소개합니다.<br>
`AnimationCurve` 는 여러 개의 spline 들로 구성됩니다. 각 spline 들은 `AnimationCurve.constant()`, <br>
`AnimationCurve.linear()`, `AnimationCurve.bezier()` 중 하나입니다. 예를 들어, 그래프를 다음과 같이
초기화해줄 수 있다는 의미입니다:

``` js
const curve = new AnimationCurve(
  AnimationCurve.bezier(/* parameters... */),
  AnimationCurve.bezier(/* parameters... */),
  AnimationCurve.linear(/* parameters... */)
);
```
예를 들어, `AnimationCurve.bezier` 는 3차 베이저 곡선을 의미합니다. 그렇기에 p0, p1, p2, p3 이라는 4개의 점이 <br>
필요합니다. 여기서 시작점과 끝점이 p1, p3 이며, control point 로 p1, p2 를 사용합니다. 하지만, `bezier()` 함수의 <br>
인자에는 p1, p2 가 없는데, 이는 대신 접선의 기울기인 tangent0, tangent1 와 가중치 weight0, weight1 를 사용하여 <br>
p1, p2 를 정의할 것이기 때문입니다. 

tangent0 은 점 p0, p1 을 지나는 접선의 기울기를 의미하며, weight0 은 p1.x 의 값을 구하는데 사용됩니다. <br>
예를 들어 p0.x 과 p3.x 사이의 거리가 100 이라면, weight0 = 0.3 은 p1.x = 30 임을 의미하게 된다는 의미입니다. <br>
weight0 값의 기본값은 0.333 이며, 가중치가 없음을 의미합니다. 이는 0.333 일때, 가중치는 없는거나 마찬가지이기 때문입니다. <br>
이렇게 구한 x 값과 tangent0 으로, y = ax + b 식을 사용하여, p1.y 의 값을 구할 수 있게 됩니다. <br>

tangent1, weight1 도 비슷합니다. p2, p3 을 지나는 접선을 정의하는데 사용되며, weight1 은 p3.x 의 값을 구하는데 사용됩니다. <br>
차이가 있다면, p0.x 과 p3.x 사이의 거리가 100 이라고 할 때, weight1 = 0.3 은 p2.x = 70 이 됨을 의미한다는 것입니다. <br>
이는 weight1 의 가중치는 내부적으로 (1 - weight1) 로 계산하여 사용하기 때문입니다.

이후에 추가될 fbx.h 에서는, 직접 AnimationCurve.constructor 를 호출하기 보다는 `AnimationCurve.fromFBXAnimNode()` 라는 함수를 <br>
통해 곡선을 초기화합니다:

``` js
const curve = AnimationCurve.fromFBXAnimCurve(
		[0, 1539538600, 3079077200, 4618615800, 6158154400, 7697693000, 9237231600, 10776770200, 12316308800, 13855847400, 15395386000, 16934924600, 18474463200, 20014001800, 21553540400, 23093079000, 24632617600, 26172156200, 27711694800, 29251233400, 30790772000, 32330310600, 33869849200, 35409387800, 36948926400, 38488465000, 40028003600, 41567542200, 43107080800, 44646619400, 46186158000, 47725696600, 49265235200, 50804773800, 52344312400, 53883851000, 55423389600, 56962928200, 58502466800, 60042005400, 61581544000, 63121082600, 64660621200, 66200159800, 67739698400, 69279237000, 70818775600, 72358314200, 73897852800, 75437391400, 76976930000, 78516468600, 80056007200, 81595545800, 83135084400, 84674623000, 86214161600, 87753700200, 89293238800, 90832777400, 92372316000, 93911854600, 95451393200, 96990931800, 98530470400, 100070009000, 101609547600, 103149086200, 104688624800],
		[0, -3.89762, -3.74269, -3.49621, -3.23234, -2.95434, -2.85141, -2.9515, -3.23291, -3.14288, -2.76332, -3.0475, -3.38802, -3.57255, -3.23292, -2.94254, -2.89413, -3.37554, -3.78994, -3.98795, -3.93332, -3.85891, -3.81412, -3.73728, -3.77069, -3.81306, -3.31971, -2.56097, -1.80471, -1.9971, -2.19743, -2.22475, -2.15241, -2.37461, -2.89607, -3.3512, -3.51807, -3.4041, -3.33, -3.19867, -3.04673, -3.0577, -3.25791, -3.52049, -3.19595, -3.13531, -3.41732, -3.59051, -3.47957, -3.17901, -3.26455, -3.64559, -4.20482, -4.53397, -4.56523, -4.34976, -4.20355, -4.15498, -4.1783, -4.13189, -3.80741, -3.2334, -2.66666, -2.55507, -2.84611, -2.84489, -2.83467, -3.16075, -3.68288],
		[1032, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840],
		[-6.4426, 0, 4.09995e-31, 0, 0, 6.02116, 4.09995e-31, 0, 0, 7.65525, 4.09995e-31, 0, 0, 8.12811, 4.09995e-31, 0, 0, 5.71388, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -5.72249, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 7.04385, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -9.37043, 4.09995e-31, 0, 0, -7.87576, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 9.45012, 4.09995e-31, 0, 0, 4.35665, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -13.4371, 4.09995e-31, 0, 0, -9.18623, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 1.93568, 4.09995e-31, 0, 0, 1.78798, 4.09995e-31, 0, 0, 1.82449, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -1.13679, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 18.7813, 4.09995e-31, 0, 0, 22.7249, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -5.89074, 4.09995e-31, 0, 0, -2.45852, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -11.1548, 4.09995e-31, 0, 0, -14.649, 4.09995e-31, 0, 0, -9.3301, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 2.82106, 4.09995e-31, 0, 0, 3.08141, 4.09995e-31, 0, 0, 4.24901, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -0.987011, 4.09995e-31, 0, 0, -6.9418, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.45688, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.82799, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 6.17255, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.99868, 4.09995e-31, 0, 0, -14.1041, 4.09995e-31, 0, 0, -13.3258, 4.09995e-31, 0, 0, -2.81349, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.42531, 4.09995e-31, 0, 0, 2.92168, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 4.17642, 4.09995e-31, 0, 0, 13.4773, 4.09995e-31, 0, 0, 17.1113, 4.09995e-31, 0, 0, 10.0428, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 0.109584, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -12.7232, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2],
);
```
`AnimationCurve.fromFBXAnimCurve()` 함수는 인자로 keyTime, keyValue, keyAttrFlags, keyAttrData, keyAttrRefCount 를 받습니다. 인자들이 의미하는 것은 다음과 같습니다: <br>

``` js
KeyTime: 그래프의 x 값.
KeyValue: 그래프의 y 값.
KeyAttrFlags : 그래프를 어떻게 그릴지에 대한 boolean vector (int32_t flag) 들의 배열.
KeyAttrDataFloat : KeyAttrFlags 의 설정대로 곡선을 그리기 위한 데이터들. flag 하나 당 4개씩이다.
KeyAttrRefCount : 한 flag 를 몇 개의 key 들이 공유하는지 갯수가 담긴 배열.
```
여기서 중요한 것은 KeyAttrFlags 인데, GameEngine.js 에 추가된 `InterpolationType`, `TangentMode`, `WeightedMode` 등의 열거형 타입들은 모두 `AnimationCurve.fromFBXAnimCurve()` 를 위해 추가된 것이기 때문입니다. <br>

다음으로 `AnimationState` 를 보도록 하겠습니다. 이름은 Unity 의 AnimationState 를 참고했습니다. 그렇기에 해당 클래스는 하나의 애니메이션을 정의하는데 사용됩니다. <br>
사용 게임 엔진들에서 애니메이션을 정의할 때, `localScale`, `localRotation` 등의 property 들을 추가하여, 시간 `t` 에 따라 값을 수정해나가는 것과 마찬가지로 <br>
`AnimationState.addProperty` 를 사용하여 각 속성들을 수정해나갑니다:

``` js
const animState = new AnimationState("Walk");

animState.addProperty(
	PropertyType.Quaternion,
	(q)=>{
		const bone = manMesh.bones["rp_nathan_animated_003_walking_shoulder_l"];
		q = bone.Rp.conjugate.mulQuat(bone.Rpost, q, bone.Rpre, bone.Rp, bone.Roff);
		bone.localRotation = q;
	},
	AnimationCurve.fromFBXAnimCurve(
		[0, 1539538600, 3079077200, 4618615800, 6158154400, 7697693000, 9237231600, 10776770200, 12316308800, 13855847400, 15395386000, 16934924600, 18474463200, 20014001800, 21553540400, 23093079000, 24632617600, 26172156200, 27711694800, 29251233400, 30790772000, 32330310600, 33869849200, 35409387800, 36948926400, 38488465000, 40028003600, 41567542200, 43107080800, 44646619400, 46186158000, 47725696600, 49265235200, 50804773800, 52344312400, 53883851000, 55423389600, 56962928200, 58502466800, 60042005400, 61581544000, 63121082600, 64660621200, 66200159800, 67739698400, 69279237000, 70818775600, 72358314200, 73897852800, 75437391400, 76976930000, 78516468600, 80056007200, 81595545800, 83135084400, 84674623000, 86214161600, 87753700200, 89293238800, 90832777400, 92372316000, 93911854600, 95451393200, 96990931800, 98530470400, 100070009000, 101609547600, 103149086200, 104688624800],
		[0, -3.89762, -3.74269, -3.49621, -3.23234, -2.95434, -2.85141, -2.9515, -3.23291, -3.14288, -2.76332, -3.0475, -3.38802, -3.57255, -3.23292, -2.94254, -2.89413, -3.37554, -3.78994, -3.98795, -3.93332, -3.85891, -3.81412, -3.73728, -3.77069, -3.81306, -3.31971, -2.56097, -1.80471, -1.9971, -2.19743, -2.22475, -2.15241, -2.37461, -2.89607, -3.3512, -3.51807, -3.4041, -3.33, -3.19867, -3.04673, -3.0577, -3.25791, -3.52049, -3.19595, -3.13531, -3.41732, -3.59051, -3.47957, -3.17901, -3.26455, -3.64559, -4.20482, -4.53397, -4.56523, -4.34976, -4.20355, -4.15498, -4.1783, -4.13189, -3.80741, -3.2334, -2.66666, -2.55507, -2.84611, -2.84489, -2.83467, -3.16075, -3.68288],
		[1032, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840],
		[-6.4426, 0, 4.09995e-31, 0, 0, 6.02116, 4.09995e-31, 0, 0, 7.65525, 4.09995e-31, 0, 0, 8.12811, 4.09995e-31, 0, 0, 5.71388, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -5.72249, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 7.04385, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -9.37043, 4.09995e-31, 0, 0, -7.87576, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 9.45012, 4.09995e-31, 0, 0, 4.35665, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -13.4371, 4.09995e-31, 0, 0, -9.18623, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 1.93568, 4.09995e-31, 0, 0, 1.78798, 4.09995e-31, 0, 0, 1.82449, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -1.13679, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 18.7813, 4.09995e-31, 0, 0, 22.7249, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -5.89074, 4.09995e-31, 0, 0, -2.45852, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -11.1548, 4.09995e-31, 0, 0, -14.649, 4.09995e-31, 0, 0, -9.3301, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 2.82106, 4.09995e-31, 0, 0, 3.08141, 4.09995e-31, 0, 0, 4.24901, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -0.987011, 4.09995e-31, 0, 0, -6.9418, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.45688, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.82799, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 6.17255, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.99868, 4.09995e-31, 0, 0, -14.1041, 4.09995e-31, 0, 0, -13.3258, 4.09995e-31, 0, 0, -2.81349, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.42531, 4.09995e-31, 0, 0, 2.92168, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 4.17642, 4.09995e-31, 0, 0, 13.4773, 4.09995e-31, 0, 0, 17.1113, 4.09995e-31, 0, 0, 10.0428, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 0.109584, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -12.7232, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2],
	),
	AnimationCurve.fromFBXAnimCurve(
		[0, 1539538600, 3079077200, 4618615800, 6158154400, 7697693000, 9237231600, 10776770200, 12316308800, 13855847400, 15395386000, 16934924600, 18474463200, 20014001800, 21553540400, 23093079000, 24632617600, 26172156200, 27711694800, 29251233400, 30790772000, 32330310600, 33869849200, 35409387800, 36948926400, 38488465000, 40028003600, 41567542200, 43107080800, 44646619400, 46186158000, 47725696600, 49265235200, 50804773800, 52344312400, 53883851000, 55423389600, 56962928200, 58502466800, 60042005400, 61581544000, 63121082600, 64660621200, 66200159800, 67739698400, 69279237000, 70818775600, 72358314200, 73897852800, 75437391400, 76976930000, 78516468600, 80056007200, 81595545800, 83135084400, 84674623000, 86214161600, 87753700200, 89293238800, 90832777400, 92372316000, 93911854600, 95451393200, 96990931800, 98530470400, 100070009000, 101609547600, 103149086200, 104688624800],
		[0, 15.4149, 15.4015, 15.5334, 15.7851, 16.1521, 16.561, 16.9474, 17.147, 17.2812, 17.3346, 17.1476, 16.7892, 16.3952, 16.471, 16.7104, 16.9467, 16.7597, 16.5904, 16.5433, 16.6507, 16.6827, 16.6049, 16.4859, 16.5005, 16.6439, 16.6953, 16.8006, 16.8586, 16.283, 15.9104, 15.9027, 16.1668, 16.2814, 16.2073, 16.2048, 16.3549, 16.631, 16.8157, 16.9622, 17.0923, 17.2716, 17.4576, 17.6163, 17.6665, 17.5194, 17.2028, 16.8787, 16.8391, 17.0673, 17.1847, 17.0677, 16.7628, 16.629, 16.6193, 16.6934, 16.6983, 16.6049, 16.4531, 16.4632, 16.4733, 16.4716, 16.6009, 16.3405, 15.7867, 15.8257, 16.0809, 16.0585, 15.7032],
		[1032, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840],
		[-8.64796, 0, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.75506, 4.09995e-31, 0, 0, 9.28132, 4.09995e-31, 0, 0, 11.6373, 4.09995e-31, 0, 0, 11.9297, 4.09995e-31, 0, 0, 8.79069, 4.09995e-31, 0, 0, 5.00579, 4.09995e-31, 0, 0, 2.81342, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -8.18021, 4.09995e-31, 0, 0, -11.2863, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 4.72904, 4.09995e-31, 0, 0, 7.13496, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -5.34442, 4.09995e-31, 0, 0, -3.24577, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 2.09189, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -2.9526, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 1.31407, 4.09995e-31, 0, 0, 2.92228, 4.09995e-31, 0, 0, 2.35079, 4.09995e-31, 0, 0, 2.44915, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -14.2224, 4.09995e-31, 0, 0, -0.695315, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.67991, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -0.222473, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 6.39195, 4.09995e-31, 0, 0, 6.91132, 4.09995e-31, 0, 0, 4.96783, 4.09995e-31, 0, 0, 4.15011, 4.09995e-31, 0, 0, 4.64092, 4.09995e-31, 0, 0, 5.47826, 4.09995e-31, 0, 0, 5.17159, 4.09995e-31, 0, 0, 3.13413, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.95552, 4.09995e-31, 0, 0, -9.6098, 4.09995e-31, 0, 0, -3.56764, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 5.18352, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -6.32803, 4.09995e-31, 0, 0, -6.58016, 4.09995e-31, 0, 0, -0.877019, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 0.444947, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -3.67834, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 0.302953, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -12.2138, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 3.51786, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -2.02097, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2],
	),
	AnimationCurve.fromFBXAnimCurve(
		[0, 1539538600, 3079077200, 4618615800, 6158154400, 7697693000, 9237231600, 10776770200, 12316308800, 13855847400, 15395386000, 16934924600, 18474463200, 20014001800, 21553540400, 23093079000, 24632617600, 26172156200, 27711694800, 29251233400, 30790772000, 32330310600, 33869849200, 35409387800, 36948926400, 38488465000, 40028003600, 41567542200, 43107080800, 44646619400, 46186158000, 47725696600, 49265235200, 50804773800, 52344312400, 53883851000, 55423389600, 56962928200, 58502466800, 60042005400, 61581544000, 63121082600, 64660621200, 66200159800, 67739698400, 69279237000, 70818775600, 72358314200, 73897852800, 75437391400, 76976930000, 78516468600, 80056007200, 81595545800, 83135084400, 84674623000, 86214161600, 87753700200, 89293238800, 90832777400, 92372316000, 93911854600, 95451393200, 96990931800, 98530470400, 100070009000, 101609547600, 103149086200, 104688624800],
		[0, -3.90718, -3.5646, -3.30821, -3.16391, -3.06515, -3.09075, -3.21698, -3.27762, -3.21153, -3.03856, -2.97016, -2.95516, -2.98234, -3.06485, -3.14419, -3.24152, -3.52475, -3.78219, -3.97292, -4.11026, -4.24276, -4.37138, -4.45135, -4.50813, -4.55391, -4.66542, -4.53606, -4.21412, -4.23951, -4.15891, -3.9349, -3.79125, -3.64996, -3.52227, -3.50627, -3.47626, -3.39308, -3.1986, -3.0897, -3.1169, -3.31828, -3.44829, -3.47454, -3.50035, -3.54452, -3.62457, -3.74093, -3.82129, -3.86738, -3.93913, -4.11001, -4.36731, -4.615, -4.83175, -5.00524, -5.10215, -5.24679, -5.4372, -5.5302, -5.68368, -5.85459, -5.6756, -5.55983, -5.5383, -5.28181, -4.97068, -4.58875, -4.1664],
		[1032, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840, 24840],
		[7.77693, 0, 4.09995e-31, 0, 0, 8.98457, 4.09995e-31, 0, 0, 6.01034, 4.09995e-31, 0, 0, 3.64589, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -2.2775, 4.09995e-31, 0, 0, -2.80301, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 3.5858, 4.09995e-31, 0, 0, 3.62054, 4.09995e-31, 0, 0, 1.2511, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -1.64539, 4.09995e-31, 0, 0, -2.42777, 4.09995e-31, 0, 0, -2.65013, 4.09995e-31, 0, 0, -5.70843, 4.09995e-31, 0, 0, -8.11, 4.09995e-31, 0, 0, -6.72263, 4.09995e-31, 0, 0, -4.92098, 4.09995e-31, 0, 0, -4.0476, 4.09995e-31, 0, 0, -3.91688, 4.09995e-31, 0, 0, -3.12881, 4.09995e-31, 0, 0, -2.05119, 4.09995e-31, 0, 0, -1.53834, 4.09995e-31, 0, 0, -2.35946, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 6.76957, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 4.56911, 4.09995e-31, 0, 0, 5.51498, 4.09995e-31, 0, 0, 4.27415, 4.09995e-31, 0, 0, 4.03471, 4.09995e-31, 0, 0, 1.44003, 4.09995e-31, 0, 0, 0.690071, 4.09995e-31, 0, 0, 1.69787, 4.09995e-31, 0, 0, 4.16492, 4.09995e-31, 0, 0, 4.55068, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, -2.44788, 4.09995e-31, 0, 0, -4.97097, 4.09995e-31, 0, 0, -2.34386, 4.09995e-31, 0, 0, -0.780912, 4.09995e-31, 0, 0, -1.04968, 4.09995e-31, 0, 0, -1.86323, 4.09995e-31, 0, 0, -2.94619, 4.09995e-31, 0, 0, -2.95083, 4.09995e-31, 0, 0, -1.89681, 4.09995e-31, 0, 0, -1.76755, 4.09995e-31, 0, 0, -3.63936, 4.09995e-31, 0, 0, -6.42277, 4.09995e-31, 0, 0, -7.57487, 4.09995e-31, 0, 0, -6.96653, 4.09995e-31, 0, 0, -5.85356, 4.09995e-31, 0, 0, -4.05608, 4.09995e-31, 0, 0, -3.62325, 4.09995e-31, 0, 0, -5.02571, 4.09995e-31, 0, 0, -4.25118, 4.09995e-31, 0, 0, -3.69722, 4.09995e-31, 0, 0, -4.86583, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0, 0, 4.4213, 4.09995e-31, 0, 0, 1.93783, 4.09995e-31, 0, 0, 1.93783, 4.09995e-31, 0, 0, 8.51431, 4.09995e-31, 0, 0, 10.396, 4.09995e-31, 0, 0, 12.0643, 4.09995e-31, 0, 0, 0, 4.09995e-31, 0],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
	),
);
```
위 예제는 `"rp_nathan_animated_003_walking_shoulder_l"` 라는 이름의 본(bone)의 localRotation 속성을 추가합니다. <br>
회전은 `Quaternion` 으로 다루기에, `AnimationState.addProperty` 의 첫 인자에 `PropertyType.Quaternion` 을 주었습니다. <br>
`Quaternion` 은 내부적으로 `Quaternion.euler()` 함수를 사용하기 때문에, yaw, pitch, roll 의 회전 각도를 의미하는 <br>
x, y, z 에 대한 곡선이 3개가 필요합니다. 그렇기에 위 예제에서는 2,3,4 번째 인자에 `AnimationCurve` 를 전달해주었습니다. <br>

`AnimationState` 는 시간 `t` 에 따라, 곡선에서 `y` 값을 얻어오며 `Quaternion.euler(new Vector3(x,y,z))` 의 결과를 <br>
`setter` 에 `q` 라는 이름의 매개변수로 전달합니다. `setter` 는 함수 객체로 원하는 속성에 `q` 를 세팅하는 것을 기대하고 있습니다. <br>

``` js
(q)=>{
   const bone = manMesh.bones["rp_nathan_animated_003_walking_shoulder_l"];     // shoulder_l 본을 가져온다.
   q = bone.Rp.conjugate.mulQuat(bone.Rpost, q, bone.Rpre, bone.Rp, bone.Roff); // Maya 의 경우, 수행하는 추가 연산
   bone.localRotation = q;                                                      // shoulder_l 본의 localRotation 속성을 세팅
},
```
물론 위 setter 는 `q = bone.Rp.conjugate.mulQuat(bone.Rpost, q, bone.Rpre, bone.Rp, bone.Roff);` 처럼 추가적인 연산을 하고 있지만 <br>
이는 fbx.h 가 해줄 일입니다. Maya 로 제작한 모델링 파일들은, `localRotation` 을 구하기 위해 `RotationOffset`, `RotationPivot`, `PreRotation` <br>
`PostRotation` 등과 추가로 곱해주어야 하기 때문입니다. 

아직 모든 기능이 완성되지 않아, 설명은 이 정도까지만 하지만 `setter` 는 이후에 애니메이션 전환을 위해 사용될 예정입니다. <br>
`setter` 의 참조가 곧 하나의 property 로 사용될 예정이며, 이후에 `Animator` 가 추가될 때 추가적인 사용법이 정해질 예정입니다. <br>

이제 새로운 예제인 `man.js` 를 보도록 하겠습니다. 위 예제는 단순히 걷는 남성을 렌더링합니다:



