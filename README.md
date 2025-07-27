## Overview
게임수학을 공부하기 위해 만든 간단한 렌더러 프로젝트입니다. 프로젝트의 목표는 WebGL 을 사용하지 않고, <br>
`CanvasRenderingContext2D` API 를 사용하여 캐릭터 모델링을 구현하는 것입니다. 또한 텍스처(Texture) 및 <br>
모델링 파일(Modeling)의 임포트(import) 또한 직접 해보는 것입니다. <br><br>

해당 프로젝트에서는 `PNG`, `FBX` `PMX` `VMD` 파일을 다루며, 스키닝 애니메이션(blend skinning)까지 구현하는 <br>
것이 최종 목표입니다. WebGL 을 사용하지 않기에, 다양한 셰이더 기법들을 다룰 수는 없습니다(삼각형을 그리는 것만으로도 <br>
벅차기 때문입니다). 그렇기에 셰이더는 단순한 텍스처 맵핑(e.g. `tex2D`)만을 다루되, 상황에 따라 간단한 램버트 조명(lambert)만을 다룹니다. <br><br>

RendererJS 를 구현하는데 참고한 참고자료(reference) 및 클래스들의 사용방법과 수학 원리에 대한 설명은 <br>
다음 문서를 참고하시길 바랍니다(documentation 은 현재 작업 중이며, 천천히 업데이트 할 예정입니다): <br><br>

**Documentation**: https://www.notion.so/RendererJS-1f83ffee6f498052874bf7ff891dce93 <br><br>

현재 RendererJS ver2 는 이전에 만들었던 버전을 리팩토링(refactoring)한 것입니다. 

# to-do
- `AnimationState`, `Animator` 완성하기
- `FBXAnimCurve.createAnimationCurve()` 완성하기
- `Deformer.blend()`, `Deformer.spherical()` 완성하기
- `Quaternion.toEuler()` 완성하기
- `vmd.js` 완성하기
- `FBXFile.createMaterials()` 완성하기
- `FBXMesh.getElement()` 에서 `ByEdge` 의 경우를 추가하기
- `PMXMorph` 추가하기
- `FBXGlobalSettings` 완성하기
- 

## Tutorial
캐릭터를 렌더링하기 전에, 가장 먼저 해야 할일은 `GameEngine` 을 초기화하여, 렌더러를 사용하기 위한 환경을 만드는 일입니다. <br>
이를 위해 다음 코드를 작성해줍시다:

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

<img src="https://file.notion.so/f/f/fe6e2013-3ec2-466b-a297-5e801e33afd0/916507d0-ec2e-4a07-85b9-b14579834a5b/%EB%85%B9%ED%99%94_2025_06_24_13_51_07_509.gif?table=block&id=21c3ffee-6f49-8014-84d5-c1333bb49190&spaceId=fe6e2013-3ec2-466b-a297-5e801e33afd0&expirationTimestamp=1753646400000&signature=eHcwrbJq5SnDrUg_8lH8i-HTCZ1TFOWH4R9qzpyNmq0">

RendererJS 에서 `Texture` 는 오직 `PNG` 파일만을 임포트할 수 있음에 유의하시길 바랍니다. `JPG` `BMP` 와 같은 다른 형식의 이미지 파일들은 <br>
`PNG` 파일로 변환하거나 


