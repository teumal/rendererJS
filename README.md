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
저게 `private` 멤버라 접근할 수 없다고 한다는... 그래서 `const parent = this.#parent; parent.#a;` 처럼 해봤는데, <br>
신기하게 이건 또 문법 에러가 아니라고 합니다;; 

이거 말고도 연산자 오버로딩(operator overloading)이 없던게 제일 불편했습니다. 그래서 `Vector3` 같은 클래스는 벡터 간의 덧셈을
``` js
const u = Vector3.up;
const v = Vector3.right;
const w = new Vector3(1,1,1);

const result0 = u.add(v,w);       // u + v + w
const result1 = u.add(v.sub(w) ); // u + (v-w)
```
이렇게 해야 했던게 진짜 아니었던;; 이런거 보면 C++ 이 그리워지긴 하는데, 이런 특징들을 포기했을 때의 편의성이 너무 좋아서 ㅠㅠ <br>
수학에 집중하기 위해 JS 를 선택하게 되었습니다. 

## Example

여기서는 `main.js` 의 내용을 간략하게 설명합니다. 위에서도 언급했듯이, 각 클래스들의 기능이 완벽한 것은 아닙니다. 

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
const steve     = GameObject.instantiate();
const steveMesh = new Mesh();
const steveTex  = new Texture("./resource/steve3d.png", GameEngine.initialize);
```
다음으로 `GameEngine.initialize` 를 호출해야 합니다. 이 함수를 호출해야 생성된 모든 `GameObject` <br>
가 매 프레임마다 업데이트 및 렌더링 될 수 있습니다. `GameObject` 를 생성하려면 `GameObject.instantiate` <br>
를 호출하면 됩니다. 





