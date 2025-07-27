import { parsePNG } from "../Importer/Texture.js";
import { GameEngine } from "../Core/GameEngine.js";

console.log(`TextureWorker.js started!`);

onmessage = (e)=>{
    const key     = e.data.key;
    const pngfile = parsePNG(e.data.arrayBuffer);
    
    const uint32Array = pngfile.uint32Array;
    const width       = pngfile.header.width;
    const height      = pngfile.header.height;
    const log         = pngfile.log;

    const message = {
        arrayBuffer : uint32Array.buffer,
        width       : width,
        height      : height,
        log         : log,
        key         : key
    };
    const transfer = [uint32Array.buffer];

    postMessage(message, transfer);
};