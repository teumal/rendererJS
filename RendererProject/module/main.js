import {GameEngine, Transform, Camera, GameObject, CircleCollider, BoxCollider, KeyCode, Bone} from "./GameEngine.js";
import {Vector2, Vector3, Vector4} from "./MyMath.js";
import * as MyMath from "./MyMath.js";
import {Renderer, Texture, Mesh, Weight, Color} from "./Renderer.js";

GameEngine.canvas = document.getElementById("canvas");
GameEngine.setResolution(480, 270);
Camera.mainCamera.screenSize = GameEngine.getResolution();
Camera.mainCamera.transform.position = new Vector3(0, 0, 0);

const steve     = GameObject.instantiate();
const steveMesh = new Mesh();
const steveTex  = new Texture("./resource/steve3d.png", GameEngine.initialize);

const cameraRot = new Vector3();
const steveRot  = new Vector3();

steve.renderer.camera        = Camera.mainCamera;
steve.renderer.mainTexture   = steveTex;
steve.renderer.mesh          = steveMesh;
steve.transform.position     = new Vector3(0, 0, 8);

let mode = true;
let mode2 = true;
let rad  = 0;
let rad2 = 0;

steveMesh.vertices = [
    new Vector3(-1, 1, -1), // 0
    new Vector3(1, 1, -1),  // 1
    new Vector3(1, -1, -1), // 2
    new Vector3(-1,-1, -1), // 3

    new Vector3(-1,1, 1), // 4
    new Vector3(1,1,1),   // 5
    new Vector3(1,-1,1),  // 6
    new Vector3(-1,-1,1), // 7

    new Vector3(-2,-1,0.5),  // 8
    new Vector3(-2,-1,-0.5), // 9
    new Vector3(-1,-1,0.5),  // 10
    new Vector3(-1,-1,-0.5), // 11

    new Vector3(1,-1,0.5),  // 12
    new Vector3(1,-1,-0.5), // 13
    new Vector3(2,-1,0.5),  // 14
    new Vector3(2,-1,-0.5), // 15

    new Vector3(-2,-4,-0.5), // 16
    new Vector3(-1,-4,-0.5), // 17
    new Vector3(1,-4,-0.5),  // 18
    new Vector3(2,-4,-0.5),  // 19

    new Vector3(2,-4,0.5),  // 20
    new Vector3(1,-4,0.5),  // 21
    new Vector3(-1,-4,0.5), // 22
    new Vector3(-2,-4,0.5), // 23

    new Vector3(-1,-7,-0.5), // 24
    new Vector3(0,-7,-0.5),  // 25
    new Vector3(1,-7,-0.5),  // 26
    new Vector3(1,-7,0.5),   // 27

    new Vector3(-1,-7,0.5), // 28
    new Vector3(0,-7,0.5),  // 29
    new Vector3(0,-4,-0.5), // 30 
    new Vector3(0,-4,0.5),  // 31
];
steveMesh.uvs = [
    new Vector2(0.125, 0.25), // 0
    new Vector2(0.25, 0.25),  // 1
    new Vector2(0.25, 0.5),   // 2
    new Vector2(0.125, 0.5),  // 3

    new Vector2(0, 0.25),     // 4
    new Vector2(0, 0.5),      // 5
    new Vector2(0.375, 0.25), // 6
    new Vector2(0.375, 0.5),  // 7

    new Vector2(0.5, 0.25), // 8
    new Vector2(0.5, 0.5),  // 9
    new Vector2(0.125, 0),  // 10
    new Vector2(0.25, 0),   // 11

    new Vector2(0.375, 0), // 12

    new Vector2(0.3125, 0.5),   // 13
    new Vector2(0.4375, 0.5),   // 14
    new Vector2(0.3125, 0.625), // 15
    new Vector2(0.4375, 0.625), // 16

    new Vector2(0.5625, 0.5),   // 17
    new Vector2(0.5625, 0.625), // 18
    new Vector2(0.5, 0.625),    // 19
    new Vector2(0.25, 0.625),   // 20

    new Vector2(0.0625, 0.5),   // 21
    new Vector2(0.1875, 0.5),   // 22
    new Vector2(0, 0.625),      // 23
    new Vector2(0.0625, 0.625), // 24

    new Vector2(0.125, 0.625),  // 25
    new Vector2(0.1875, 0.625), // 26
    new Vector2(0.625, 0.625),  // 27
    new Vector2(0.6875, 0.625), // 28

    new Vector2(0.6875, 0.5), // 29
    new Vector2(0.75, 0.5),   // 30
    new Vector2(0.8125, 0.5), // 31
    new Vector2(0.75, 0.625), // 32

    new Vector2(0.8125, 0.625), // 33
    new Vector2(0.875, 0.625),  // 34
    new Vector2(0, 1),          // 35
    new Vector2(0.0625, 1),     // 36

    new Vector2(0.125, 1),  // 37
    new Vector2(0.1875, 1), // 38
    new Vector2(0.25, 1),   // 39
    new Vector2(0.3125, 1), // 40

    new Vector2(0.4375, 1), // 41
    new Vector2(0.5, 1),    // 42
    new Vector2(0.625, 1),  // 43
    new Vector2(0.6875, 1), // 44

    new Vector2(0.75, 1),   // 45
    new Vector2(0.8125, 1), // 46
    new Vector2(0.875, 1),  // 47
];  
steveMesh.indices = [

    // Head
    0,1,3,  0,1,3, // 정면0
    1,2,3,  1,2,3, // 정면1

    1,5,2,  1,6,2, // 우측0
    5,6,2,  6,7,2, // 우측1

    5,4,6,  6,8,7, // 후면0
    4,7,6,  8,9,7, // 후면1

    4,0,7,  4,0,5, // 좌측0
    0,3,7,  0,3,5, // 좌측1

    4,5,0,  10,11,0, // 위0
    5,1,0,  11,1,0,  // 위1

    3,2,7,  11,12,1, // 아래0
    2,6,7,  12,6,1,  // 아래1


    // Body
    11,13,17,  15,16,40, // 정면0
    13,18,17,  16,41,40, // 정면1

    13,12,18,  16,19,41, // 우측0
    12,21,18,  19,42,41, // 우측1

    12,10,21,  19,27,42, // 후면0
    10,22,21,  27,43,42, // 후면1

    10,11,22,  20,15,39, // 좌측0
    11,17,22,  15,40,39, // 좌측1

    10,12,11,  13,14,15, // 위0
    12,13,11,  14,16,15, // 위1

    17,18,22,  14,17,16, // 아래0
    18,21,22,  17,18,16, // 아래1


    // LeftArm
    9,11,16,   28,32,44, // 정면0
    11,17,16,  32,45,44, // 정면1

    11,10,17,  32,33,45, // 우측0
    10,22,17,  33,46,45, // 우측1

    10,8,22,  33,34,46, // 후면0
    8,23,22,  34,47,46, // 후면1

    8,9,23,   27,28,43, // 좌측0
    9,16,23,  28,44,43, // 좌측1

    8,10,9,   29,30,28, // 위0
    10,11,9,  30,32,28, // 위1

    16,17,23,  30,31,32, // 아래0
    17,22,23,  31,33,32, // 아래1


    // RightArm
    13,15,18,  28,32,44, // 정면0
    15,19,18,  32,45,44, // 정면1

    15,14,19,  32,33,45, // 우측0
    14,20,19,  33,46,45, // 우측1

    14,12,20,  33,34,46, // 후면0
    12,21,20,  34,47,46, // 후면1

    12,13,21,  27,28,43, // 좌측0
    13,18,21,  28,44,43, // 좌측1

    12,14,13,  29,30,28, // 위0
    14,15,13,  30,32,28, // 위1

    18,19,21,  30,31,32, // 아래0
    19,20,21,  31,33,32, // 아래1


    // LeftLeg
    17,30,24,  24,25,36, // 정면0
    30,25,24,  25,37,36, // 정면1

    30,31,25,  25,26,37, // 우측0
    31,29,25,  26,38,37, // 우측1

    31,22,29,  26,20,38, // 후면0
    22,28,29,  20,39,38, // 후면1

    22,17,28,  23,24,35, // 좌측0
    17,24,28,  24,36,35, // 좌측1

    22,31,17,  21,3,24, // 위0
    31,30,17,  3,25,24, // 위1

    24,25,28,  3,22,25,  // 아래0
    25,29,28,  22,26,25, // 아래1


    // RightLeg
    30,18,25,  24,25,36, // 정면0
    18,26,25,  25,37,36, // 정면1

    18,21,26,  25,26,37, // 우측0
    21,27,26,  26,38,37, // 우측1

    21,31,27,  26,20,38, // 후면0
    31,29,27,  20,39,38, // 후면1

    31,30,29,  23,24,35, // 좌측0
    30,25,29,  24,36,35, // 좌측1

    31,21,30,  21,3,24, // 위0
    21,18,30,  3,25,24, // 위1

    25,26,29,  3,22,25,  // 아래0
    26,27,29,  22,26,25, // 아래1
];

// 정점들을 y 축으로 3씩 올려, 중심점을 맞춘다.
for(let i=0; i<steveMesh.vertexCount; ++i) {
    steveMesh.vertices[i].y += 3;
}
steveMesh.collider = new BoxCollider(steveMesh);

const pelvis   = new Bone(new Vector3(0, -1, 0) ); // 골반
const rightArm = new Bone(new Vector3(1.5, 1.5, 0) ); // 우측팔
const leftArm  = new Bone(new Vector3(-1.5, 1.5, 0) ); // 좌측팔
const leftLeg  = new Bone(new Vector3(-0.5, -1, 0) ); // 좌측다리
const rightLeg = new Bone(new Vector3(0.5, -1, 0) ); // 우측다리
const spine    = new Bone();  // 척추
const neck     = new Bone(new Vector3(0, 2, 0) );  // 목


// 본의 계층구조를 설정한다:
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

leftArm.transform.localRotation = new Vector3(0, 0, 90);
rightArm.transform.localRotation = new Vector3(0, 0, -90);


const leftArmWeight  = new Weight(["LeftArm"], [1]);
const rightArmWeight = new Weight(["RightArm"], [1]);
const leftLegWeight  = new Weight(["LeftLeg"], [1]);
const rightLegWeight = new Weight(["RightLeg"], [1]);
const neckWeight     = new Weight(["Neck"], [1]);
const pelvisWeight   = new Weight(["Pelvis"], [1]);
const spineWeight    = new Weight(["Spine"], [1]);


steveMesh.bones = {
   "Pelvis"   : pelvis,
   "RightArm" : rightArm,
   "LeftArm"  : leftArm,
   "LeftLeg"  : leftLeg,
   "RightLeg" : rightLeg,
   "Spine"    : spine,
   "Neck"     : neck
};
steveMesh.weights = [

    // Head
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 

    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 

    neckWeight, neckWeight, neckWeight, 
    neckWeight, neckWeight, neckWeight, 


    // Body
    spineWeight, spineWeight, pelvisWeight, 
    spineWeight, pelvisWeight, pelvisWeight, 
    spineWeight, spineWeight, pelvisWeight, 
    spineWeight, pelvisWeight, pelvisWeight, 
    spineWeight, spineWeight, pelvisWeight, 

    spineWeight, pelvisWeight, pelvisWeight, 
    spineWeight, spineWeight, pelvisWeight, 
    spineWeight, pelvisWeight, pelvisWeight, 
    spineWeight, spineWeight, spineWeight, 
    spineWeight, spineWeight, spineWeight, 

    pelvisWeight, pelvisWeight, pelvisWeight, 
    pelvisWeight, pelvisWeight, pelvisWeight, 

    // LeftArm
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,

    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,

    leftArmWeight, leftArmWeight, leftArmWeight,
    leftArmWeight, leftArmWeight, leftArmWeight,


    // RightArm
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,

    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,

    rightArmWeight, rightArmWeight, rightArmWeight,
    rightArmWeight, rightArmWeight, rightArmWeight,


    // LeftLeg
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,

    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,

    leftLegWeight, leftLegWeight, leftLegWeight,
    leftLegWeight, leftLegWeight, leftLegWeight,


    // RightLeg
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,

    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,

    rightLegWeight, rightLegWeight, rightLegWeight,
    rightLegWeight, rightLegWeight, rightLegWeight,
];

steve.update = ()=>{
    const deltaTime = GameEngine.deltaTime;
    const rotSpeed  = deltaTime * 90;
    const speed     = deltaTime * 20;
    const camera    = steve.renderer.camera;

    // 게임 로직 갱신
    if(GameEngine.getKeyDown(KeyCode.Alpha8) ) {
        mode = !mode;
    }


    if(mode) {
        let cnt = 0;

        const rotation = cameraRot;
        const position = camera.transform.position;

        // Yaw
        if(GameEngine.getKey(KeyCode.Left) ) rotation.y -= rotSpeed, cnt++;
        if(GameEngine.getKey(KeyCode.Right) ) rotation.y += rotSpeed, cnt++;


        // 짐벌락 현상 발생 용
        if(GameEngine.getKey(KeyCode.Space) ) rotation.y = 180, cnt++;

        // Camera Depth
        if(GameEngine.getKey(KeyCode.W) ) position.z += speed, cnt++;
        if(GameEngine.getKey(KeyCode.S) ) position.z -= speed, cnt++;

        if(cnt>0) {
            camera.transform.setTransform(position, Vector3.one, rotation);
        }
    }

    else {
        let cnt = 0;

        const rotation = steveRot;
        const position = steve.transform.position;

        // Yaw
        if(GameEngine.getKey(KeyCode.Left) ) rotation.y += rotSpeed, cnt++;
        if(GameEngine.getKey(KeyCode.Right) ) rotation.y -= rotSpeed, cnt++;

        // Pitch
        if(GameEngine.getKey(KeyCode.Up) ) rotation.x += rotSpeed, cnt++;
        if(GameEngine.getKey(KeyCode.Down) ) rotation.x -= rotSpeed, cnt++;

        // Roll
        if(GameEngine.getKey(KeyCode.A) ) rotation.z -= rotSpeed, cnt++;
        if(GameEngine.getKey(KeyCode.D) ) rotation.z += rotSpeed, cnt++;

        // depth
        if(GameEngine.getKey(KeyCode.W) ) position.z += speed, cnt++;
        if(GameEngine.getKey(KeyCode.S) ) position.z -= speed, cnt++;

        // Pitch = 90
        if(GameEngine.getKeyDown(KeyCode.Space) ) rotation.x = 90, cnt++;

        if(cnt>0) {
            steve.transform.setTransform(position, steve.transform.localScale, rotation);
        }
        
        GameEngine.$ctx.fillStyle = 'black';
        GameEngine.$ctx.fillText(`Yaw   : ${steveRot.y}`, 10, 10);
        GameEngine.$ctx.fillText(`Pitch : ${steveRot.x}`, 10, 20);
        GameEngine.$ctx.fillText(`Roll  : ${steveRot.z}`, 10, 30);
        GameEngine.$ctx.fillText(`deltaTime : ${GameEngine.deltaTime}`, 10, 40);  
    }


    // 애니메이션 갱신
    const angle = Math.sin(rad += deltaTime * 10) * 45;
    
    leftArm.transform.localRotation = new Vector3(angle, 0, 0);
    rightArm.transform.localRotation = new Vector3(-angle, 0, 0);
    leftLeg.transform.localRotation  = new Vector3(-angle, 0, 0);
    rightLeg.transform.localRotation = new Vector3(angle, 0, 0);
};

steve.renderer.mesh.boneVisible = true;
