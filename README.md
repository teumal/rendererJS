# Overview
게임수학을 공부하기 위해 만든 간단한 렌더러 프로젝트입니다. 프로젝트의 목표는 WebGL 을 사용하지 않고, <br>
`CanvasRenderingContext2D` API 를 사용하여 캐릭터 모델링을 구현하는 것입니다. 또한 텍스처(Texture) 및 <br>
모델링 파일(Modeling)의 임포트(import) 또한 직접 해보는 것입니다. <br><br>

해당 프로젝트에서는 `PNG`, `FBX` `PMX` `VMD` 파일을 다루며, 스키닝 애니메이션(blend skinning)까지 구현하는 <br>
것이 최종 목표입니다. WebGL 을 사용하지 않기에, 다양한 셰이더 기법들을 다룰 수는 없습니다(삼각형을 그리는 것만으로도 <br>
벅차기 때문입니다). 그렇기에 셰이더는 단순한 텍스처 맵핑(e.g. `tex2D`)만을 다루되, 상황에 따라 간단한 램버트 조명(lambert)만을 다룹니다. <br><br>

RendererJS 를 구현하는데 참고한 참고자료(reference) 및 클래스들의 사용방법과 수학 원리에 대한 설명은 <br>
다음 문서를 참고하시길 바랍니다(documentation 은 현재 작업 중이며, 천천히 업데이트 할 예정입니다): <br><br>

**Documentation**: [https://www.notion.so/RendererJS-1f83ffee6f498052874bf7ff891dce93](https://satin-hill-a2d.notion.site/RendererJS-1f83ffee6f498052874bf7ff891dce93) <br><br>

현재 RendererJS 는 이전 버전을 리팩토링한 결과입니다. 이전 버전과의 차이점은 모듈(module)들을 <br>
좀더 세분화하고 좀 더 최적화헸다는 점입니다. 또한 C++ 로 JS 파일을 작성했었던 이전 버전과 다르게 <br>
`fbx.js`, `pmx.js` 와 같은 모듈(Importer modules)들이 추가되었습니다. 이전 버전이 궁금하다면 <br>
`RendererJS (legacy version).zip` 의 압축을 풀어서 사용하시길 바랍니다.


### to-do
- `AnimationState`, `Animator` 완성하기
- `FBXAnimCurve.createAnimationCurve()` 완성하기
- `Deformer.blend()`, `Deformer.spherical()` 완성하기
- `Quaternion.toEuler()` 완성하기
- `vmd.js` 완성하기
- `FBXFile.createMaterials()` 완성하기
- `FBXMesh.getElement()` 에서 `ByEdge` 의 경우를 추가하기
- `PMXMorph` 추가하기
- `FBXGlobalSettings` 완성하기
- `FBXDeformer` 에서 `transformAssociateModel` 의 경우 처리하기

# Tutorial
캐릭터를 렌더링하기 전에 가장 먼저 해야 할일은 `GameEngine` 을 초기화하여, 렌더러를 사용하기 위한<br> 
환경을 만드는 일입니다. 이를 위해 다음 코드를 작성해줍시다:

``` js
Texture.useWorker = true;
GameEngine.initialize(document.getElementById("canvas"));

const main = Camera.main;

main.setViewport(
    main.sx + main.width * 0.125,
    main.sy + 50,
    main.width * 0.8,
    main.height * 0.8
);

main.fov   = 60;
main.zNear = 1;
main.zFar  = 5000;
```

맨 위의 문장(step-by-step)부터 살펴보도록 하겠습니다. `Texture.useWorker = true;` 는 background thread <br>
에서 텍스처 파일을 로드하기 위해서 사용됩니다. 크기가 큰 이미지 파일들(e.g. 2024 x 2024)을 연달아 로드하는 <br>
작업이 main thread 에서 이루어지면, 웹페이지가 잠시 작동하지 않을 수 있습니다. 비동기 함수(e.g. `Promise`) <br>
는 작업을 잠시 미루는 것 뿐이지 결국에는 main thread 에서 진행되니까요. JS 에서 스레딩(Threading)을 사용할 <br>
수 있는 것은 오직 `Worker` API 를 사용하는 방법 뿐입니다. `Texture.useWorker = true` 로 설정하면 <br>
`TextureWorker.js` 가 활성화되어, 웹페이지가 프리징(freezing)에 걸리는 것을 방지할 수 있습니다:

![Texture useWorker](https://github.com/user-attachments/assets/db9668e6-b17e-4c6f-abcc-b1b0892c637d)


RendererJS 에서 `Texture` 는 오직 `PNG` 파일만을 임포트할 수 있음에 유의하시길 바랍니다. <br>
다시 말해 `JPG` `BMP` 와 같은 다른 형식의 이미지 파일들은 `PNG` 파일로 직접 변환한 뒤 사용해야 합니다. <br>
이는 RendererJS 의 목표가 가능한 직접 구현해는 것이기 때문이며, 변환하는 과정이 불편하다면 대신 <br>
기존 JS 의 `Image` 클래스를 사용하는 것 또한 가능합니다.  <br><br>

다음은 `GameEngine.initialize(document.getElementById("canvas"));` 입니다. RendererJS 는 <br>
디스플레이 출력 장치를 모니터(monitor)가 아니라 캔버스(canvas)라고 생각합니다. 그렇기에 `index.html` <br>
에서 `<canvas>` 를 얻어와서 `getContext('2d')` 를 통해 `CanvasRenderingContext2D` 객체를 얻어와야 합니다 <br>
이 과정을 대신 해주는 것이 바로 `GameEngine.initialize()` 함수입니다. 또한 `Window.requestAnimationFrame` <br>
을 등록하여 프레임 업데이트(player loop)가 수행되게 해줍니다. <br><br>

`Camera.main` 은 기본 카메라 객체를 의미하며, `GameEngine.initialize()` 에서 카메라 객체가 존재하지 않는다면 <br>
자동으로 생성합니다. `Camera.setViewport()` 함수는 캔버스에서 카메라가 사용할 영역을 지정하는데 사용됩니다 <br>
`setViewport(sx, sy, width, height)` 를 인자로 받으며, 캔버스의 `getImageData(sx, sy, width, height)` <br>
와 비슷하다고 생각하시면 됩니다. 이후의 `Camera.fov, Camera.zNear, Camera.zFar` 는 원근투영 행렬을 만드는데 <br>
사용되는 정보들입니다. 자세한 내용은 Documentation 을 읽어보시길 바랍니다.

이렇게 카메라(Camera)와 게임엔진(GameEngine)을 초기화하여, 렌더러를 사용할 환경을 만드는데 성공했습니다. <br>
이제 할일은 `GameObject` 를 생성하여, 매 프레임마다 수행할 작업을 `GameObject.update()` 에 등록하고 <br>
`GameObject.renderer.mesh` 를 초기화하여, 캐릭터를 렌더링하는 일 뿐입니다:
``` js
const gameObject = new GameObject();

gameObject.update = function() { // update() 는 매 프레임마다 자동으로 호출되는 함수입니다.
   /** do something .. */ 
};
```
`GameEngine` 은 게임엔진에서 사용되는 기능들을 아주 간단하게 구현해놓은 클래스입니다. 예를 들어 키보드 입력은 <br>
`GameEngine.getKeyDown()`, `GameEngine.getKey()`, `GameEngine.getKeyUp()` 등의 함수에 `KeyCode` 열거형을 <br>
전달하는 것으로 감지할 수 있습니다. 이전 버전의 RendererJS 와 다르게 프레임 기반(frame-based)으로 작동하기에, <br>
직접 `window.addEventListener("keydown", handler)` 처럼 하기 보다는, `GameEngine` 의 함수들을 사용하는 것을 <br>
권장합니다. <br><br>

또한 `GameEngine.deltaTime` 을 사용하여, 이전 프레임에서 현재 프레임으로 진입하기까지 걸린 시간(in seconds)을 <br>
얻을 수 있음에 주목하시길 바랍니다. `window.requestAnimationFrame()` 은 일반적으로 `60 fps` 간격으로 호출되지만 <br>
실행환경에 따라 호출간격이 다를 수 있습니다. 즉 항상 매 프레임마다 `2.0` 만큼 캐릭터를 움직이게 하기 보다는 <br>
`2.0 * GameEngine.deltaTime` 처럼 해주어서 1초에 `2.0` 만큼 움직이게 한다면, 다른 환경에서도 비슷한 결과를 <br>
얻을 수 있습니다.

## Example 0

렌더러를 사용할 환경을 조성했으니, 이제 캐릭터 모델링을 불러와봅시다. RendererJS 는 파일을 동기적으로 읽을 수 있도록 <br>
`FileStream` 이라는 클래스를 정의해서 사용합니다. 사용 방법은 C++ 의 `std::ifstream` 과 비슷합니다. 물론 직접 <br>
`File` 을 읽는 것은 아니며, `File.arrayBuffer()` 로 얻은 `ArrayBuffer` 를 읽도록 설계되었습니다:

``` js
import {FileStream, TextEncoding, DataType} from "./Importer/FileStream.js";

const input = document.getElementById("input");

input.addEventListener("change", (e)=>{
   const file = e.target.files[0];
   
   file.arrayBuffer().then((arrayBuffer)=>{
       const stream = new FileStream(arrayBuffer);
       
       const mimeType = stream.readString(TextEncoding.Utf8, 4);
       const version  = stream.read(DataType.Float);
   });
});
```

RendererJS 는 `PNG`, `PMX`, `FBX`, `VMD` 파일들을 불러올 수 있으며, 이 파일들을 불러오기 위해 사용되는 클래스들이 <br>
`Texture`, `PMXFile`, `FBXFile`, `VMDFile` 입니다. 모두 `FileStream` 클래스를 사용하여 파일을 읽어들이며, <br>
로드가 완료되었을 때 `oncomplete` 콜백이 호출됩니다 (참고로 Worker API 를 사용하는 것은 오직 `Texture` <br>
뿐입니다). 이제 `example0.js` 의 코드들을 살펴보도록 합시다:

``` js
document.getElementById("textureInput").addEventListener("change", (e)=>{
    const count = e.target.files.length;

    for(let i=0; i<count; ++i) {
        textures.push(new Texture(e.target.files[i], tex => console.log(`${tex}`)) );
    }
});
document.getElementById("pmxInput").addEventListener("change", (e)=>{
    const pmxfile = new PMXFile();

    pmxfile.read(e.target.files[0], (file)=>{
        gameObject.renderer.mesh      = file.createMesh();
        gameObject.renderer.materials = file.createMaterials(textures);
        console.log(`${file}`);
    });
});
document.getElementById("fbxInput").addEventListener("change", (e)=>{
    const fbxfile  = new FBXFile();
    const renderer = gameObject.renderer;

    fbxfile.read(e.target.files[0], (file)=>{
        console.log(`${file}`)

        if(file.meshes.length > 0) {
            renderer.mesh      = file.createMesh();
            renderer.materials = file.createMaterials();
        }
        if(file.animStack) {
            state = file.createAnimationState(gameObject);
        }
    });
});

```
위 코드는 `"textureInput"`, `"pmxInput"`, `"fbxInput"` 를 id 로 갖는 Element 들을 찾고, <br>
`addEventListener("change", (e)=>{ ... })` 와 같이 콜백함수를 등록해줍니다. 여기서 `PNG` 파일의 <br>
경우에만 `multiple` 속성이 적용되어, 여러개의 파일을 선택할 수 있습니다. <br><br>

먼저 `FBX` 파일부터 살펴보겠습니다. `FBX` 파일을 불러오기 위해서는 `FBXFile.read(file, oncomplete)` 함수를 <br>
호출해야 합니다. `e.target.files[0]` 을 파싱 완료했다면 `oncomplete` 콜백함수가 호출되며,  <br>
`FBXFile.toString()` 으로 FBXFile 에서 읽어들인 정보를 간략하게 표시합니다. <br><br>

FBX 파일은 Mesh, Bone, Material, Deformer 등의 정보 뿐만 아니라, 애니메이션(Animation) 정보 또한  <br>
담을 수 있습니다. `FBXFile.animStack != undefined` 의 여부로 `FBXFile` 에 애니메이션이 담겨 있는지 <br>
여부를 확인가능합니다. FBXFile 은 AnimationStack 이 하나만 존재가능하기에, 하나의 FBX 파일에는  <br>
하나의 애니메이션만 담을 수 있음에 유의합니다. 예를 들어 캐릭터 애니메이션이 `Walk`, `Run` 등등 여러개라면, <br>
FBX 파일 또한 여러개가 필요하다는 의미입니다. <br><br>

파싱한 FBX 파일에서 `Mesh`를 생성하려면, `FBXFile.createMesh()` 를 호출하시길 바랍니다. `Mesh` 는  <br>
정점 버퍼(Vertex), 본(Bone), 인덱스 버퍼(Index), 스켈레탈 애니메이션(skeletal animation)에서 사용할  <br>
가중치(weights, etc) 정보를 담을 `Deformer` 가 정의되어 있습니다. 메시의 정보를 얻었다면, 메시가 몇 개의 <br>
서브메시(submesh)로 구성되었는지, 서브메시들의 삼각형을 그릴 때 사용할 셰이더(Shader)에 대한 정보가 필요하겠네요. <br><br>

파싱한 FBX 파일에서 `Material[]` 를 생성하려면, `FBXFile.createMaterials()` 를 호출하시길 바랍니다.  <br>
본래 인자로 `textures` 배열을 받아서 사용할 텍스쳐를 자동 매칭해주는 기능이 필요하지만, `PMX` 파일과는  <br>
달리 이 기능은 아직 구현되지 않았습니다. 고로 텍스처 맵핑을 하기 위해서는 직접 <br>
`renderer.material.mainTex = textures[0]` 와 같이 할당해주어야 합니다. <br><br>

애니메이션은 크게 `Animator`, `AnimationState` 로 나눌 수 있습니다. `AnimationState` 는 하나의 <br>
애니메이션(animation)을 정의하며, `Animator` 는 `"Run"`, `"Walk"` 같은 애니메이션들을 관리하고,  <br>
자연스럽게 보간하는 역할을 담당합니다. 파싱한 FBX 파일에서 `AnimationState` 를 생성하려면,  <br>
`FBXFile.createAnimationState()` 호출하시길 바랍니다. 다만 아직 `Animator` 는 구현되지 않은 관계로,  <br>
`GameObject.update()` 에서 직접 `AnimationState.evaluate(t)` 처럼 해주는 것으로 애니메이션을 갱신 <br>
해야 함에 유의하시길 바랍니다. <br><br>

아래 영상은 https://free3d.com/3d-model/manuel-animated-001-dancing-256270.html 에서 다운받을 수 있는 <br>
춤추는 사람의 모델링 파일을 임포트합니다:

[<img width="1881" height="941" alt="dancing_man" src="https://github.com/user-attachments/assets/34cafe67-9864-4305-8b04-f8dff9da096d" />](https://youtu.be/MvE98X46lOI?si=RBHo61f4KKxhxtEP)

위 영상에서는 하나의 FBX 파일에 춤추는 애니메이션까지 포함되어 있었으며, `FBXFile.toString()` 을 해보면 <br>
서브메시(submesh)가 하나만 존재함을 알 수 있습니다. 그렇기에 사용되는 `Material` 또한 하나이며, <br>
`renderer.material.mainTex = textures[0]` 처럼 직접 사용할 `Texture` 를 등록해주었습니다. <br><br>

다음은 `PMX` 파일을 살펴봅시다. `PMX` 파일을 불러오기 위해서는 `PMXFile.read(file, oncomplete)` 함수를 <br>
호출해야 합니다. `e.target.files[0]` 을 파싱 완료했다면 `oncomplete` 콜백함수가 호출되며, <br>
`PMXFile.toString()` 으로 PMXFile 에서 읽어들인 정보를 간략하게 표시합니다. <br><br>

`Mesh`, `Material[]` 을 생성하는 방법은 `FBXFile` 때와 같습니다. PMX 파일은 `Material` 이 사용할 `Texture` <br>
의 이름이 항상 저장되어 있으므로(내부적으로 texture index 의 형태로 저장됩니다), `PMXFile.createMaterials()` <br>
의 인자로 `textures` 의 배열을 넘겨주면, 텍스처의 이름을 통해 자동으로 `Material.mainTex` 를 할당가능합니다. <br><br>

다만 유의사항이 한가지 있는데, PMX 파일에 저장되어 있는 텍스처의 이름과 다운받은 이미지 파일이 <br>
다를 수도 있다는 점입니다.  예를 들어 https://genshin.hoyoverse.com/ja/news/detail/104561 에서 <br>
다운 받을 수 있는 리사(Lisa)의 모델링 파일의 경우, 일부 텍스처 파일이 PMX 에 저장되어 있는 정보와 이름이 일치하지 않음을 볼 수 있습니다:

<img width="1836" height="940" alt="lisa_texture_name1" src="https://github.com/user-attachments/assets/262536de-7455-4e04-b180-ff76c99dda3b" />
<img width="855" height="202" alt="lisa_texture_name2" src="https://github.com/user-attachments/assets/8e2fa075-e8e6-4cb4-ad7c-8652c55cf79a" />

보다시피 얼굴 부분의 서브메시(submesh)에서 사용할 `Texture` 를 찾지 못해, 캐릭터의 얼굴이 제대로 <br>
그려지지 않습니다. 이는 `PMXFile.toString()` 에서는 얼굴을 렌더링할 때 사용할 텍스처의 이름은 <br>
`Texture\脸.png` 이지만, 다운받은 폴더에는 `Texture\顔.png` 라는 이름으로 저장되어 있기 때문입니다. <br><br>

고로 이 문제를 해결하기 위해서는 이미지 파일의 이름을 `Texture\顔.png` 에서 `Texture\脸.png` 로 <br>
수정해주어야 주어야 하며, 마찬가지로 `髪.png` 또한 `头发.png` 으로 수정해주면 됩니다. 각각 중국어로 얼굴과 <br>
머리카락을 의미하며, 수정한 결과는 다음과 같습니다:

<img width="1856" height="929" alt="lisa_rendering" src="https://github.com/user-attachments/assets/695778a3-0721-4672-a1ca-3e95e381506b" />

FBX 와는 다르게 PMX 자체에는 애니메이션 정보가 들어있지 않습니다. 대신 VMD (Vocaloid Motion Data) 파일을<br>
불러오는 것으로 애니메이션을 적용할 수 있습니다. 다만 아직 `vmd.js` 가 구현되지 않았기에, 현재 RendererJS 에서<br>
애니메이션은 FBX 파일만 가능함에 유의해주시길 바랍니다. <br><br>

그런 관계로 PMX 파일로 불러온 캐릭터에게 `Bone`, `Deformer` 는 불필요하게 계산량만 늘리는 정보들일 뿐입니다. <br>
성능을 향상시키기 위해 `gameObject.renderer.mesh.vertices.forEach(vertex => vertex.deformer = null);` <br>
문장을 추가해주시길 바랍니다. 리사(lisa)의 경우, `29 fps` 에서 `39 fps` 까지 성능이 향상되는 결과를 볼 수 있습니다.
