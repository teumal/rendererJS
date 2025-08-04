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

<img src="https://github.com/teumal/rendererJS/blob/main/Texture.useWorker.gif?raw=true">


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
}l
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
`addEventListener("change", (e)=>{ ... })` 와 같이 콜백함수를 등록해줍니다. 


