# rendererJS

<table><tr><td>
  
   ## Vector2
  <sub> Defined in "MyMath.js"</sub>
  ``` js
    export class Vector2;
  ```
  2차원 벡터를 정의합니다. `Vector2` 클래스에서 `Vector2` 를 돌려주는 모든 함수들은
  해당 벡터의 복사본을 돌려줍니다. <br>

  `Vector2` 는 참조변수이므로, 새로운 `Vector2` 를 할당하려면 `Vector2.clone()` 를 사용하시길 바랍니다. 

  <br>
  
  ### Static Methods
  |Signature|Description|
  |-|-|
  |`static dot(u:Vector2, v:Vector2) : number;`|`u` 와 `v` 의 내적|
  |`static distance(u:Vector2, v:Vector2) : number;`|`u` 와 `v` 의 거리|
  |`static angle(u:Vector2, v:Vector2) : number;`|`u` 와 `v` 의 사이각 `in degree`|
  |`static signedAngle(from:Vector2, to:Vector2) : number;`|`u` 와 `v` 의 사이각 `in degree`. 결과가 음수면 `from` 이 반시계로<br> 회전해야 함을 의미합니다|

  ### Static Properties
  |Signature|Description|
  |-|-|
  |`static get up() : Vector2;`|`(0,1)`|
  |`static get down() : Vector2;`|`(0,-1)`|
  |`static get left() : Vector2;`|`(-1,0)`|
  |`static get right() : Vector2;`|`(1,0)`|
  |`static get zero() : Vector2;`|`(0,0)`|
  |`static get one() : Vector2;`|`(1,1)`|


  ### Methods
  |Signature|Description|
  |-|-|
  |`constructor(x:number=0, y:number=0);`|생성자|
  |`add(v:Vector2, ...args : Vector2[]) : Vector2;`|벡터들의 덧셈|
  |`sub(v:Vector2, ...args : Vector2[]) : Vector2;`|벡터들의 뺄셈|
  |`mul(scalar:number) : Vector2;`|벡터의 스칼라곱|
  |`normalize() : void;`|해당 벡터를 정규화시킵니다|
  |`toString() : string;`|벡터를 문자열로 변환한 결과를 돌려줍니다|
  |`clone() : Vector2;`|해당 벡터의 복사본을 돌려줍니다|
  
  ### Properties
  |Signature|Description|
  |-|-|
  |`get sqrMagnitude() : number;`|`magnitude` 와 비슷하나, `Math.sqrt()` 를 적용하지 않습니다|
  |`get magnitude() : number;`|벡터의 크기를 돌려줍니다|
  |`get normalized() : Vector2;`|벡터를 정규화한 결과를 돌려줍니다|
  
</td></tr></table>
