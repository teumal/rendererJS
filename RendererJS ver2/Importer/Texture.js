
import { FileStream, DataType, TextEncoding } from "./FileStream.js";
import { BitStream, inflate } from "./zlib.js";
import { Color } from "../Core/Shader.js";


/** Texture 를 정의합니다. */
export class Texture {
    static #defaultArray = new Uint32Array([224, 124, 235, 255]);
    static #queue        = null;
    static #worker       = null;


    /** 텍스처에서 사용되는 Uint32Array 를 얻습니다. constructor/read 에 sharedArrayBuffer = true 를 전달했었다면
     * 
     *  uint32Array 는 Worker 와 main thread 간 공유됩니다. */
    uint32Array;

    /** 텍스처의 너비를 얻습니다. 결과는 number 입니다. */
    width;

    /** 텍스처의 높이를 얻습니다. 결과는 number 입니다. */
    height;

    /** Texture 의 이름을 나타내는 string 을 얻습니다. 이름은 경로(path)와 확장자명(extension)이 제외됩니다. */
    name;

    /** Texture 의 정보를 담은 문자열입니다. toString() 을 호출하면 자동으로 출력됩니다. */
    log;


    //////////////////////////
    // Public Methods       //
    //////////////////////////


    /** Texture 를 생성하며, file != null 이라면 PNG file 을 읽고 파싱합니다. file 은 PNG 파일을 나타내는 File 객체이며, 
     * 
     *  텍스처 로드가 완료되었을 때 oncomplete(Texture)를 호출합니다. 텍스처 로드는 기본적으로 동기적으로 수행되지만,
     * 
     *  Texture.useWorker = true 라면 background thread 에서 비동기로 작업이 수행됩니다. */
    constructor(file=null, oncomplete=null) { 
        this.uint32Array = Texture.#defaultArray;
        this.width       = 1;
        this.height      = 1;
        this.name        = "";

        if(file != null) {
            this.read(file, oncomplete);
        }
    }


    /** PNG file 을 읽고 파싱합니다. file 은 PNG 파일을 나타내는 File 객체이며, 텍스처 로드가 완료되었을 때 oncomplete(Texture)를 호출합니다. 
     * 
     *  텍스처 로드는 기본적으로 동기적으로 수행되지만, Texture.useWorker = true 라면 background thread 에서 비동기로 작업이 수행됩니다. */
    read(file, oncomplete=null) {

        file.arrayBuffer().then((arrayBuffer)=>{
            this.name = file.name.slice(0, file.name.length-4);

            if(Texture.useWorker) {     // Texture.useWorker = true 라면, TextureWorker.js 와 메시지를 주고 받으며
                const key = Date.now(); // parsePNG 를 background thread 에서 진행한다.

                Texture.#worker.postMessage({ key : key, arrayBuffer : arrayBuffer }, [arrayBuffer]);
                Texture.#queue.push({ key : key, tex : this, oncomplete : oncomplete });
                return;
            }
            const result = parsePNG(arrayBuffer);

            this.uint32Array = result.uint32Array;
            this.width       = result.header.width;
            this.height      = result.header.height;
            this.log         = result.log;

            if(oncomplete != null) {
                oncomplete(this);
            }
        }); 
    }


    /** Texture 를 나타내는 string 을 돌려줍니다. */
    toString() { return `name : ${this.name}\n\n${this.log}`; }


    /** (x,y) 위치에 있는 색상을 out 에 담아 돌려줍니다. Texture 로드가 완료되지 않았다면
     * 
     *  getColor 는 rgba(224, 124, 235, 255) 색상을 돌려줍니다. */
    getColor(x, y, out=new Color()) { 
        out.rgba = this.uint32Array[this.width*y + x];
        return out;
    }


    //////////////////////////
    // Static Methods       //
    //////////////////////////


    /** TextureWorker.js 의 사용여부를 설정합니다. true 라면 PNG 파일을 파싱하는 과정을
     * 
     *  background thread 에서 진행하게 됩니다. */
    static get useWorker() { return Texture.#worker != null; }
    static set useWorker(value) {

        if(window.Worker == null) {
            console.error("[Texture.useWorker] Your browser doesn't support web workers");
            return;
        }

        if(value && Texture.#worker == null) {
            const worker = Texture.#worker = new Worker("./Worker/TextureWorker.js", { type : "module" });
            const queue  = Texture.#queue  = [];

            worker.onmessage = (e)=>{
                const result = e.data;
                const index  = queue.findIndex(a => a.key==e.data.key);

                if(index != -1) {
                    const tex = queue[index].tex;

                    tex.uint32Array = new Uint32Array(result.arrayBuffer);
                    tex.width       = result.width;
                    tex.height      = result.height;
                    tex.log         = result.log;

                    if(queue[index].oncomplete != null) {
                        queue[index].oncomplete(tex);
                    }
                    queue.splice(index, 1);
                }
            };
        }

        else if(!value && Texture.#worker != null) {
            Texture.#worker.terminate();
            Texture.#worker = null;
        }
    }
};


/** PNG 파일의 청크를 정의합니다. */
export class PNGChunk {
    length; // Uint. 청크의 길이
    type;   // Uint8[4]. 청크의 타입을 나타내는 문자열.
};


/** PNG 파일의 IHDR 청크를 정의합니다. */
export class PNGHeader {
    static #sampleCount = [1, 0, 3, 1, 2, 0, 4];

    width;  // Uint32, the maximum value is 2^(31). 
    height; // Uint32, the maximum value is 2^(31).

    bitDepth; // Uint8,  the number of bits per sample or per palette index (not per pixel). 
              // valid values are 1,2,4,8, and 16

    colorType; // Uint8, sums of the follwing values: 
               // 1: palette used, 
               // 2: color used, 
               // 4: alpha channel used.
               // valid values are 0, 2, 3, 4, and 6.

    compressionMethod; // Uint8, only compression method 0 (deflate/inflate compression with a sliding window of at most 32768 bytes)

    filterMethod; // Uint8, the preprocessing method applied to the image data before compression.
                  // only filter method 0 (adaptive filtering with five basic filter types)

    interlaceMethod; // Uint8, the transmission order of the image data. two values are currently defined:
                     // 0: no interlace
                     // 1: Adam7 interlace

    /** IHDR 청크를 읽습니다. */
    load(stream) {
        this.width             = stream.read(DataType.Uint32, false);
        this.height            = stream.read(DataType.Uint32, false);
        this.bitDepth          = stream.read(DataType.Uint8);
        this.colorType         = stream.read(DataType.Uint8);
        this.compressionMethod = stream.read(DataType.Uint8);
        this.filterMethod      = stream.read(DataType.Uint8);
        this.interlaceMethod   = stream.read(DataType.Uint8);

        stream.read(DataType.Uint32); // CRC
    }


    /** [filteredData, pixelData] 를 돌려줍니다.*/
    createArray() {
        const size = this.width * this.height * this.bpp;                 // pixelData 의 크기
        return [new Uint8Array(size + this.width), new Uint8Array(size)]; // filteredData 는 filter_type 을 나타내는 byte 가 scanline 마다 붙는다.
    }


    /** pixel 의 byte 갯수를 돌려줍니다(bytes per pixel) */
    get bpp() { return (this.bitDepth/8) * PNGHeader.#sampleCount[this.colorType]; }
};


/** PNG 파일의 PLTE 청크를 정의합니다. */
export class PNGPalette {
    #entry;

    /** PLTE 청크를 읽습니다. */
    load(stream, chunk) {
        this.#entry  = new Uint8Array(4 * (chunk.length / 3));

        for(let i=0, j=0; i<chunk.length; i+=3, j+=4) {
            this.#entry[j]   = stream.read(DataType.Uint8);
            this.#entry[j+1] = stream.read(DataType.Uint8);
            this.#entry[j+2] = stream.read(DataType.Uint8);
            this.#entry[j+3] = 255;
        }
        stream.read(DataType.Uint32); // CRC
    }


    /** 팔레트에서 index 번째의 색상을 out 에 담아 돌려줍니다. 결과는 Color 입니다. */
    getColor(index, out=new Color()) {
        index *= 4;
        
        return out.assign(
            this.#entry[index],   // r
            this.#entry[index+1], // g
            this.#entry[index+2], // b
            255
        );
    }
};


/** Parsed PNG 파일을 정의합니다. */
export class PNGFile {
    header      = new PNGHeader();
    palette     = new PNGPalette();
    uint32Array = null;
    log         = null;
};


/** PNG 파일을 읽고 파싱하여 PNGFile 을 돌려줍니다. arrayBuffer 는 File.arrayBuffer() 의 결과를 기대하고 있습니다.
 * 
 *  sharedArrayBuffer = true 를 넘긴다면, PNGFile.uint8Array 를 Worker 와 main thread 가 공유할 수 있도록
 * 
 *  SharedArrayBuffer 로 만들어서 돌려줍니다. */
export function parsePNG(arrayBuffer) {
    const stream  = new FileStream(arrayBuffer);
    const chunk   = new PNGChunk();
    const pngfile = new PNGFile();

    let filteredData, pixelData;

    const signature = stream.readString(TextEncoding.Utf8, 8); // 89h 50h 4eh 47h 0dh 0ah 1ah 0ah

    if(signature.includes("PNG") == false) { // 파일 시그니쳐에 'PNG' 가 포함되어 있지 않다면
        throw "파일 확장자가 PNG 가 아닙니다!";  // 예외가 발생한다.
    }

    do {
        chunk.length = stream.read(DataType.Uint32, false);     // Uint32,   Chunk Length 
        chunk.type   = stream.readString(TextEncoding.Utf8, 4); // Uint8[4], Chunk Type

        switch(chunk.type) {

            case "IHDR": {                                               // IHDR 청크를 읽습니다. 
                pngfile.header.load(stream);                             // 항상 13 byte 크기를 가진다.
                [filteredData,pixelData] = pngfile.header.createArray(); // filteredData, pixelData 를 고정길이 배열로 할당한다.
                break;
            }
            case "IDAT": {
                inflate(new BitStream(stream, chunk), filteredData); // IDAT 청크에 들어있는 zlib data stream 의 압축을 해제한다.
                stream.read(DataType.Uint32);                        // inflate 는 모든 IDAT 청크들을 읽을 때까지 진행된다.
                break;                                               // inflate 가 끝나면 현재 청크의 CRC 를 읽어준다.
            }
            case "PLTE": {
                pngfile.palette.load(stream, chunk); // PLTE 청크를 읽습니다. 팔레트는 1..256 의 길이를 가지며
                break;                               // 청크의 길이는 항상 3의 배수이다.
            }
            default: {
                stream.ignore(chunk.length+4); // 필요없는 청크들은 무시한다.
            }
        };
                
    } while(chunk.type != "IEND");

    unfilterData(pngfile.header, filteredData, pixelData); // filteredData 의 필터링을 해제하여, pixelData 에 저장한다.

    pngfile.log  = `width               : ${pngfile.header.width}\n`;
    pngfile.log += `height              : ${pngfile.header.height}\n`;
    pngfile.log += `bitDepth            : ${pngfile.header.bitDepth}\n`;
    pngfile.log += `colorType           : ${pngfile.header.colorType}\n`;
    pngfile.log += `compressitionMethod : ${pngfile.header.compressionMethod}\n`;
    pngfile.log += `filterMethod        : ${pngfile.header.filterMethod}\n`;
    pngfile.log += `interlaceMethod     : ${pngfile.header.interlaceMethod}\n\n`;

    pngfile.log += `filteredData : ${filteredData.length} bytes\n`;
    pngfile.log += `pixelData    : ${pixelData.length} bytes`;


    // pixelData 의 내용을 해석하여, uint32Array 를 생성한다.
    pngfile.uint32Array = new Uint32Array(pngfile.header.width * pngfile.header.height); 
    const uint8Array    = new Uint8Array(pngfile.uint32Array.buffer);

    switch(pngfile.header.colorType) {
        case GRAYSCALE:       { printGrayscale(pixelData, uint8Array); break; }
        case TRUECOLOR:       { printTruecolor(pixelData, uint8Array); break; }
        case INDEXED_COLOR:   { printIndexedColor(pixelData, uint8Array, pngfile.palette); break; }
        case GRAYSCALE_ALPHA: { printGrayscaleAlpha(pixelData, uint8Array); break; }
        case TRUECOLOR_ALPHA: { printTruecolorAlpha(pixelData, uint8Array); break; }
    };

    return pngfile;
}


/** Filtering method 의 이름을 나타내는 상수. */
const NONE    = 0;
const SUB     = 1;
const UP      = 2;
const AVERAGE = 3;
const PAETH   = 4;


/** Color type 의 이름을 나타내는 상수. */
const GRAYSCALE       = 0;
const TRUECOLOR       = 2;
const INDEXED_COLOR   = 3;
const GRAYSCALE_ALPHA = 4;
const TRUECOLOR_ALPHA = 6;


/** filterType == PAETH */
function paethPredictor(a, b, c) {
    const p  = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);

    if (pa <= pb && pa <= pc) {
        return a;
    }
    else if (pb <= pc) {
        return b;
    }
    return c;
}


/** data 의 필터링을 해제하고, 결과를 pixelData 에 저장합니다. */
function unfilterData(header, from, to) {
    const bpp   = header.bpp;         // bytes per pixel
    const width = header.width * bpp; // bytes per scanline

    const left = (r,c) => {
        return (c >= bpp) ? to[r * width + c - bpp] : 0;
    };
    const above = (r,c) => { 
        return (r > 0) ? to[(r - 1) * width + c] : 0;
    };
    const upperleft = (r,c) => {
        return (r > 0 && c >= bpp) ? to[(r-1)*width + c-bpp] : 0;
    };

    let size = 0;

    for(let row=0, i=0; row < header.height; ++row) {
        const filterType = from[i++];

        for(let col=0; col<width; ++col) {
            const filteredByte = from[i++];
            let result;

            switch(filterType) {

                case NONE: {
                    result = filteredByte;
                    break;
                }
                case SUB: {
                    result = filteredByte + left(row,col);
                    break;
                }
                case UP: {
                    result = filteredByte + above(row,col);
                    break;
                }
                case AVERAGE: {
                    result = filteredByte + Math.floor(      // JS 의 number 는 원래 float 임에 유의.
                        (left(row,col) + above(row,col)) / 2 // 즉 정수로의 형변환이 필요하다.
                    );
                    break;
                }
                case PAETH: {
                    result = filteredByte + paethPredictor(
                        left(row,col), above(row,col), upperleft(row,col)
                    );
                    break;
                }
                default: {
                    throw "InvalidFilterType";
                }
            };
            

            // Unsigned arithmetic modulo 256 이 사용됨에 유의. 이 과정 덕분에 result 는
            // 항상 byte 에 딱 맞게 된다. C++ 은 (uint8_t) 처럼 형변환을 하면 자동으로 수행되는 작업이지만
            // JS 는 그렇지 않으므로 직접 % 연산을 해주어야 한다.
            to[size++] = result %= 256;
        }
    }
}


/** colorType == GRAYSCALE */
function printGrayscale(pixelData, uint8Array) {
    const pixelCount = pixelData.length;

    for(let i=0, j=0; i<pixelCount; ++i, j+=4) {
        const color = pixelData[i];

        uint8Array[j]   = color;
        uint8Array[j+1] = color;
        uint8Array[j+2] = color;
        uint8Array[j+3] = 255;
    }
}


/** colorType == TRUECOLOR  */
function printTruecolor(pixelData, uint8Array) {
    const pixelCount = pixelData.length;

    for(let i=0, j=0; i<pixelCount; i+=3, j+=4) {
        uint8Array[j]   = pixelData[i];   // r
        uint8Array[j+1] = pixelData[i+1]; // g
        uint8Array[j+2] = pixelData[i+2]; // b
        uint8Array[j+3] = 255;
    }
}


/** colorType == INDEXED_COLOR */
function printIndexedColor(pixelData, uint8Array, palette) {
    const pixelCount = pixelData.length;
    const color      = new Color();

    for(let i=0, j=0; i<pixelCount; ++i, j+=4) {
        palette.getColor(pixelData[i], color);

        uint8Array[j]   = color.r;
        uint8Array[j+1] = color.g;
        uint8Array[j+2] = color.b;
        uint8Array[j+3] = color.a;
    }
}


/** colorType == GRAYSCALE_ALPHA */
function printGrayscaleAlpha(pixelData, uint8Array) {
    const pixelCount = pixelData.length;

    for(let i=0, j=0; i<pixelCount; i+=2, j+=4) {
        const color = pixelData[i];
        const alpha = pixelData[i+1];

        uint8Array[j]   = color;
        uint8Array[j+1] = color;
        uint8Array[j+2] = color;
        uint8Array[j+3] = alpha;
    }
}


/** colorType == TRUECOLOR_ALPHA */
function printTruecolorAlpha(pixelData, uint8Array) {
    const pixelCount = pixelData.length;

    for(let i=0, j=0; i<pixelCount; i+=4, j+=4) {
        uint8Array[j]   = pixelData[i];   // r
        uint8Array[j+1] = pixelData[i+1]; // g
        uint8Array[j+2] = pixelData[i+2]; // b
        uint8Array[j+3] = pixelData[i+3]; // a
    }
}