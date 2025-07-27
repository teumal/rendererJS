
import { GameEngine, KeyCode, GameObject } from "./Core/GameEngine.js";
import { Renderer } from "./Core/Renderer.js";
import {Vector2,Vector3,Vector4,Matrix4x4,Quaternion,DualQuaternion} from "./Core/MyMath.js";
import { Material, Color } from "./Core/Shader.js";
import {Mesh, Triangle, Vertex} from "./Core/Mesh.js";
import * as Shader from "./Core/Shader.js";
import { Texture } from "./Importer/Texture.js";
import { PMXFile } from "./Importer/pmx.js";
import { Camera } from "./Core/Camera.js";
import * as MyMath from "./Core/MyMath.js";

const cvs = document.getElementById("canvas");
GameEngine.initialize(cvs);

const steve = new GameObject();
const main  = Camera.main;

main.setViewport(
    main.sx + main.width * 0.25,
    main.sy + 50,
    main.width * 0.5,
    main.height * 0.8
);
main.fov = 60;
main.zNear = 1;
main.zFar = 100;

let frameRate = 0;
let timer     = 0;
let count     = 0;

document.getElementById("textureInput").addEventListener("change", (e)=>{
    steve.renderer.material.mainTex = new Texture(e.target.files[0], tex=>console.log(`${tex}`));
});

steve.renderer.mesh = new Mesh();

steve.renderer.mesh.vertices = [
    new Vertex(new Vector4(-1, 1, -1), new Vector3(0.125, 0.25)), // 0
    new Vertex(new Vector4(1, 1, -1), new Vector3(0.25, 0.25)),   // 1
    new Vertex(new Vector4(1, -1, -1), new Vector3(0.25, 0.5)),   // 2
    new Vertex(new Vector4(-1, -1, -1), new Vector3(0.125, 0.5)), // 3

    new Vertex(new Vector4(1, 1, -1), new Vector3(0.25, 0.25)), // 4
    new Vertex(new Vector4(1, 1, 1), new Vector3(0.5, 0.25)),   // 5
    new Vertex(new Vector4(1, -1, 1), new Vector3(0.5, 0.5)),   // 6
    new Vertex(new Vector4(1,-1, -1), new Vector3(0.25, 0.5)),  // 7

    new Vertex(new Vector4(-1,1,1), new Vector3(0.125, 0)),    // 8
    new Vertex(new Vector4(1,1,1), new Vector3(0.25, 0)),      // 9
    new Vertex(new Vector4(-1,1,-1), new Vector3(0.25, 0.25)),  // 10
    new Vertex(new Vector4(1,1,-1), new Vector3(0.125, 0.25)), // 11

    new Vertex(new Vector4(-1,1,1), new Vector3(0, 0.25)),     // 12
    new Vertex(new Vector4(-1,1,-1), new Vector3(0.125, 0.25)), // 13
    new Vertex(new Vector4(-1,-1,-1), new Vector3(0.125, 0.5)), // 14
    new Vertex(new Vector4(-1,-1,1), new Vector3(0, 0.5)),      // 15

    new Vertex(new Vector4(-1,-1,-1), new Vector3(0.25, 0)),   // 16
    new Vertex(new Vector4(1,-1,-1), new Vector3(0.375, 0)),   // 17
    new Vertex(new Vector4(1,-1,1), new Vector3(0.375, 0.25)), // 18
    new Vertex(new Vector4(-1,-1,1), new Vector3(0.25, 0.25)), // 19

    new Vertex(new Vector4(1,1,1), new Vector3(0.375, 0.25)), // 20
    new Vertex(new Vector4(-1,1,1), new Vector3(0.5, 0.25)),    // 21
    new Vertex(new Vector4(-1,-1,1), new Vector3(0.375, 0.5)),  // 22
    new Vertex(new Vector4(1,-1,1), new Vector3(0.375, 0.5)), // 23
];
steve.renderer.mesh.indices = [
    0,1,3, 1,2,3,       // 정면
    4,5,7, 5,6,7,       // 우측
    8,9,10, 9,11,10,    // 위측
    12,13,15, 13,14,15, // 좌측
    16,17,19, 17,18,19, // 하단
    20,21,23, 21,22,23  // 후면
];

steve.renderer.mesh.vertices.forEach(vert => vert.position.mulScalar(10, vert.position));

let rotY = 0;
let rotX = 0;
let pos  = new Vector3(0,0,50);

steve.transform.scale = new Vector3(0.2, 0.1, 0.1);

steve.update = function() {
    const deltaTime = GameEngine.deltaTime;
    const moveSpeed = deltaTime * 20;
    const rotSpeed  = deltaTime * 360;

    count++;

    if((timer += deltaTime) >= 1) {
        frameRate = count;
        timer -= 1;
        count = 0;
    }

    Renderer.drawCube2D(main.min, main.width, main.height, new Color(135, 169, 207, 255));

    if(GameEngine.getKeyDown(KeyCode.Space)) steve.renderer.materials.forEach(mat => mat.wireFrameMode = !mat.wireFrameMode);

    if(GameEngine.getKey(KeyCode.Left))  rotY += rotSpeed;
    if(GameEngine.getKey(KeyCode.Right)) rotY -= rotSpeed;
    if(GameEngine.getKey(KeyCode.Up))    rotX += rotSpeed;
    if(GameEngine.getKey(KeyCode.Down))  rotX -= rotSpeed;

    if(GameEngine.getKey(KeyCode.W)) pos.z += moveSpeed;
    if(GameEngine.getKey(KeyCode.S)) pos.z -= moveSpeed;
    if(GameEngine.getKey(KeyCode.A)) pos.x -= moveSpeed;
    if(GameEngine.getKey(KeyCode.D)) pos.x += moveSpeed;
    if(GameEngine.getKey(KeyCode.F)) pos.y -= moveSpeed;
    if(GameEngine.getKey(KeyCode.R)) pos.y += moveSpeed;

    steve.transform.setLocalTransform(steve.transform.localScale, Quaternion.euler(rotX, rotY, 0), pos);

    GameEngine.drawText(`${frameRate} fps`, new Vector2(50,  50));
    GameEngine.drawText(`position  : ${pos}`, new Vector2(50, 70));
    GameEngine.drawText(`rotation  : ${new Vector3(rotX, rotY, 0)}`, new Vector2(50, 90));
};

