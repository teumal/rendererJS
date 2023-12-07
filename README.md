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
  |`static get up: Vector2;`|`(0,1)`|
  |`static get down : Vector2;`|`(0,-1)`|
  |`static get left : Vector2;`|`(-1,0)`|
  |`static get right : Vector2;`|`(1,0)`|
  |`static get zero : Vector2;`|`(0,0)`|
  |`static get one : Vector2;`|`(1,1)`|


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
  |`get sqrMagnitude : number;`|`magnitude` 와 비슷하나, `Math.sqrt()` 를 적용하지 않습니다|
  |`get magnitude : number;`|벡터의 크기를 돌려줍니다|
  |`get normalized : Vector2;`|벡터를 정규화한 결과를 돌려줍니다|
  
</td></tr></table>



<table><tr><td>

  ## Matrix2x2
   <sub> Defined in "MyMath.js"</sub>
  ``` js
    export class Matrix2x2;
  ```
  2 x 2 크기의 정방행렬을 정의합니다. `Matrix2x2` 에서 `Matrix2x2` 를 돌려주는 모든 함수들은 <br>
  
  복사본을 돌려줍니다. `Matrix2x2` 는 참조변수이므로, 새로운 `Matrix2x2` 를 할당하려면 `Matrix2x2.clone()` <br>
  
  를 사용하시길 바랍니다. 또한 열 기준 행렬을 사용한다는 점에 유의하시길 바랍니다. 그렇기에 <br>
  
  x 기저가 (a,b), y 기저가 (c,d) 인 행렬과 벡터 (x,y) 와의 행렬 곱의 결과는 다음과 같습니다:

  ``` js
    [a b]   [x]  
    [c d] · [y]
    = (ax+by, cx+dy)
  ```

  <br>
  
  ### Static Properties
  |Signature|Description|
  |-|-|
  |`static get identity : Matrix2x2`|항등 행렬을 돌려줍니다|

  ### Methods
  |Signature|Description|
  |-|-|
  |`constructor(m0:Vector2=Vector2.zero, m1:Vector2=Vector2.zero)`|생성자|
  |`transpose() : Matrix2x2;`|행렬을 전치한 결과를 얻습니다|
  |`toString() : string;`|행렬을 문자열로 변환한 결과를 얻습니다|
  |`mulMat(mat:Matrix2x2, ...mats:Matrix2x2[]) : Matrix2x2`|행렬끼리의 곱의 결과를 얻습니다|
  |`add(mat:Matrix2x2) : Matrix2x2`|행렬 하나와 행렬 덧셈을 수행한 결과를 얻습니다|
  |`sub(mat:Matrix2x2) : Matrix2x2`|행렬 하나의 행렬 뺄셈을 수행한 결과를 얻습니다|
  |`mulScalar(scalar:number) : Matrix2x2`|행렬의 스칼라곱을 수행한 결과를 얻습니다|
  |`mulVector(v:Vector2) : Vector2`|2차원 벡터와 행렬곱을 수행한 결과를 돌려줍니다|
  |`det() : number`|해당 행렬의 행렬식의 결과를 돌려줍니다|
  |`clone() : Matrix2x2`|행렬의 복사본을 돌려줍니다|

  ### Properties
  |Signature|Description|
  |-|-|
  |`get set m0 : Vector2`|x기저에 해당하는 벡터를 얻거나 수정합니다|
  |`get set m1 : Vector2`|y기저에 해당하는 벡터를 얻거나 수정합니다|
</td></tr></table>


<table><tr><td>
  
   ## Vector3
  <sub> Defined in "MyMath.js"</sub>
  ``` js
    export class Vector3;
  ```
  3차원 벡터를 정의합니다. `Vector3` 클래스에서 `Vector3` 를 돌려주는 모든 함수들은
  해당 벡터의 복사본을 돌려줍니다. <br>

  `Vector3` 는 참조변수이므로, 새로운 `Vector3` 를 할당하려면 `Vector3.clone()` 를 사용하시길 바랍니다. 

  <br>
  
  ### Static Methods
  |Signature|Description|
  |-|-|
  |`static dot(u:Vector3, v:Vector3) : number;`|`u` 와 `v` 의 내적|
  |`static distance(u:Vector3, v:Vector3) : number;`|`u` 와 `v` 의 거리|
  |`static cross(u:Vector3, v:Vector3) : Vector3`|`u` 와 `v` 와 전부 직교하는 벡터|

  ### Static Properties
  |Signature|Description|
  |-|-|
  |`static get up: Vector3;`|`(0,1,0)`|
  |`static get down : Vector3;`|`(0,-1,0)`|
  |`static get left : Vector3;`|`(-1,0,0)`|
  |`static get right : Vector3;`|`(1,0,0)`|
  |`static get zero : Vector3;`|`(0,0,0)`|
  |`static get one : Vector3;`|`(1,1,1)`|
  |`static get forward : Vector3;`|`(0,0,1)`|
  |`static get backward : Vector3;`|`(0,0,-1)`|


  ### Methods
  |Signature|Description|
  |-|-|
  |`constructor(x:number=0, y:number=0, z:number=0);`|생성자|
  |`add(v:Vector3, ...args : Vector3[]) : Vector2;`|벡터들의 덧셈|
  |`sub(v:Vector3, ...args : Vector3[]) : Vector2;`|벡터들의 뺄셈|
  |`mul(scalar:number) : Vector3;`|벡터의 스칼라곱|
  |`normalize() : void;`|해당 벡터를 정규화시킵니다|
  |`toString() : string;`|벡터를 문자열로 변환한 결과를 돌려줍니다|
  |`clone() : Vector3;`|해당 벡터의 복사본을 돌려줍니다|
  
  ### Properties
  |Signature|Description|
  |-|-|
  |`get sqrMagnitude : number;`|`magnitude` 와 비슷하나, `Math.sqrt()` 를 적용하지 않습니다|
  |`get magnitude : number;`|벡터의 크기를 돌려줍니다|
  |`get normalized : Vector3;`|벡터를 정규화한 결과를 돌려줍니다|
  
</td></tr></table>


<table><tr><td>

  ## Matrix3x3
   <sub> Defined in "MyMath.js"</sub>
  ``` js
    export class Matrix3x3;
  ```
  3 x 3 크기의 정방행렬을 정의합니다. `Matrix3x3` 에서 `Matrix3x3` 를 돌려주는 모든 함수들은 <br>
  
  복사본을 돌려줍니다. `Matrix3x3` 는 참조변수이므로, 새로운 `Matrix3x3` 를 할당하려면 `Matrix3x3.clone()` <br>
  
  를 사용하시길 바랍니다. 또한 열 기준 행렬을 사용한다는 점에 유의하시길 바랍니다. 그렇기에 <br>
  
  x 기저가 (a,b,c), y 기저가 (d e f), z 기저가 (g h i) 인 행렬과 벡터 (x,y,z) 와의 행렬 곱의 결과는 다음과 같습니다:

  ``` js
    [a b c]   [x]  
    [d e f] · [y]
    [g h i]   [z]
    = (ax+by+cz, dx+ey+fz, gx+hy+iz)
  ```

  <br>
  
  ### Static Properties
  |Signature|Description|
  |-|-|
  |`static get identity : Matrix3x3`|항등 행렬을 돌려줍니다|

  ### Methods
  |Signature|Description|
  |-|-|
  |`constructor(m0:Vector3=Vector3.zero, m1:Vector3=Vector3.zero, m2:Vector3=Vector3.zero)`|생성자|
  |`transpose() : Matrix3x3;`|행렬을 전치한 결과를 얻습니다|
  |`toString() : string;`|행렬을 문자열로 변환한 결과를 얻습니다|
  |`mulMat(mat:Matrix3x3, ...mats:Matrix3x3[]) : Matrix2x2`|행렬끼리의 곱의 결과를 얻습니다|
  |`add(mat:Matrix2x2) : Matrix3x3`|행렬 하나와 행렬 덧셈을 수행한 결과를 얻습니다|
  |`sub(mat:Matrix2x2) : Matrix3x3`|행렬 하나의 행렬 뺄셈을 수행한 결과를 얻습니다|
  |`mulScalar(scalar:number) : Matrix3x3`|행렬의 스칼라곱을 수행한 결과를 얻습니다|
  |`mulVector(v:Vector3) : Vector3`|3차원 벡터와 행렬곱을 수행한 결과를 돌려줍니다|
  |`det() : number`|해당 행렬의 행렬식의 결과를 돌려줍니다|
  |`clone() : Matrix3x3`|행렬의 복사본을 얻습니다|

  ### Properties
  |Signature|Description|
  |-|-|
  |`get set m0 : Vector3`|x기저에 해당하는 벡터를 얻거나 수정합니다|
  |`get set m1 : Vector3`|y기저에 해당하는 벡터를 얻거나 수정합니다|
  |`get set m2 : Vector3`|z기저에 해당하는 벡터를 얻거나 수정합니다|
</td></tr></table>

