
import { GameEngine, KeyCode, GameObject } from "./Core/GameEngine.js";
import { Renderer } from "./Core/Renderer.js";
import {Vector2,Vector3,Vector4,Matrix4x4,Quaternion,RotationOrder, DualQuaternion, MyMath} from "./Core/MyMath.js";
import { Material, Color, Shader } from "./Core/Shader.js";
import {Mesh, Triangle, Vertex, Bone } from "./Core/Mesh.js";
import {Texture} from "./Importer/Texture.js";
import { PMXFile } from "./Importer/pmx.js";
import { Camera } from "./Core/Camera.js";
import { FBXFile, FBXAnimCurve } from "./Importer/fbx.js";
import { Transform } from "./Core/Transform.js";
import { ExtrapolationMode, AnimationCurve, PropertyType } from "./Core/Animator.js";
import { BitStream } from "./Importer/zlib.js";
import { FileStream } from "./Importer/FileStream.js";
import { VMDFile } from "./Importer/vmd.js";


Texture.useWorker = true;
GameEngine.initialize(document.getElementById("canvas"));

const gameObject = new GameObject();
const textures   = [];
const main       = Camera.main;

main.setViewport(
    main.sx + main.width * 0.125,
    main.sy + 50,
    main.width * 0.8,
    main.height * 0.8
);

main.fov   = 60;
main.zNear = 1;
main.zFar  = 5000;


let frameRate = 0;
let timer     = 0;
let count     = 0;


let state;

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

let rotY    = 0;
let rotX    = 0;
let pos     = new Vector3(0,-13, 12.2);
let isdirty = false;

let t = 0;


gameObject.transform.position = pos;

gameObject.update = function() {
    const deltaTime = GameEngine.deltaTime;
    const moveSpeed = deltaTime * 20;
    const rotSpeed  = deltaTime * 360;

    isdirty = false;
    count++;

    if((timer += deltaTime) >= 1) {
        frameRate = count;
        timer -= 1;
        count = 0;
    }

    Renderer.drawCube2D(main.min, main.width, main.height, new Color(135, 169, 207, 255)); // 카메라 영역을 표시
    

    if(state) {
        state.evalulate(t);
        t += deltaTime;
    }


    if(GameEngine.getKey(KeyCode.Left))  { rotY += rotSpeed; isdirty = true; } 
    if(GameEngine.getKey(KeyCode.Right)) { rotY -= rotSpeed; isdirty = true; } 
    if(GameEngine.getKey(KeyCode.Up))    { rotX += rotSpeed; isdirty = true; } 
    if(GameEngine.getKey(KeyCode.Down))  { rotX -= rotSpeed; isdirty = true; } 

    if(GameEngine.getKeyDown(KeyCode.Space)) gameObject.renderer.materials.forEach(mat => mat.wireFrameMode = !mat.wireFrameMode);
    if(GameEngine.getKeyDown(KeyCode.Alpha0)) gameObject.renderer.materials.forEach(mat => mat.backfaceCulling = !mat.backfaceCulling);
    if(GameEngine.getKeyDown(KeyCode.Alpha1)) gameObject.renderer.boneVisible = !gameObject.renderer.boneVisible;

    if(GameEngine.getKey(KeyCode.W)) { pos.z += moveSpeed; isdirty = true; }
    if(GameEngine.getKey(KeyCode.S)) { pos.z -= moveSpeed; isdirty = true; }
    if(GameEngine.getKey(KeyCode.A)) { pos.x -= moveSpeed; isdirty = true; }
    if(GameEngine.getKey(KeyCode.D)) { pos.x += moveSpeed; isdirty = true; }
    if(GameEngine.getKey(KeyCode.F)) { pos.y -= moveSpeed; isdirty = true; }
    if(GameEngine.getKey(KeyCode.R)) { pos.y += moveSpeed; isdirty = true; }

    if(isdirty) {
        gameObject.transform.setLocalTransform(gameObject.transform.localScale, Quaternion.euler(rotX, rotY, 0), pos);
    }
    GameEngine.drawText(`${frameRate} fps, ${GameEngine.frameNumber} frame`, new Vector2(50,  50+10));
    GameEngine.drawText(`position (WSAD): ${pos}`, new Vector2(50, 70+10));
    GameEngine.drawText(`rotation (Arrow) : ${new Vector3(rotX, rotY, 0)}`, new Vector2(50, 90+10));

    GameEngine.drawText(`backfaceCulling (Alpha0): ${gameObject.renderer.material.backfaceCulling}`, new Vector2(50, 120+10));
    GameEngine.drawText(`wireFrameMode (Space): ${gameObject.renderer.material.wireFrameMode}`, new Vector2(50, 140+10));
    GameEngine.drawText(`boneVisible (Alpha1) : ${gameObject.renderer.boneVisible}`, new Vector2(50, 160+10));
};

