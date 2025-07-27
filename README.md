## Overview
게임수학을 공부하기 위해 만든 간단한 렌더러 프로젝트입니다. 프로젝트의 목표는 WebGL 을 사용하지 않고, <br>
`CanvasRenderingContext2D` API 를 사용하여 캐릭터 모델링을 구현하는 것입니다. 또한 텍스처(Texture) 및 <br>
모델링 파일(Modeling)의 임포트(import) 또한 직접 해보는 것입니다. <br><br>

해당 프로젝트에서는 `PNG`, `FBX` `PMX` `VMD` 파일을 다루며, 스키닝 애니메이션(blend skinning)까지 구현하는 <br>
것이 최종 목표입니다. WebGL 을 사용하지 않기에, 다양한 셰이더 기법들을 다룰 수는 없습니다(삼각형을 그리는 것만으로도 <br>
벅차기 때문입니다). 그렇기에 셰이더는 단순한 텍스처 맵핑(e.g. `tex2D`)만을 다루되, 상황에 따라 간단한 램버트 조명(lambert) <br>
만을 다룹니다. <br><br>

RendererJS 를 구현하는데 참고한 참고자료(reference) 및 클래스들의 사용방법과 수학 원리에 대한 설명은 <br>
다음 문서를 참고하시길 바랍니다(documentation 은 현재 작업 중이며, 천천히 업데이트 할 예정입니다): <br><br>

**Documentation**: https://www.notion.so/RendererJS-1f83ffee6f498052874bf7ff891dce93
