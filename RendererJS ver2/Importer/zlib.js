
//
// inflate 함수의 구현 과정과 참고자료는 여기서 보실 수 있습니다: https://blog.naver.com/zmsdkemf8703/223414167784
// PNG 를 읽어보는 글이지만, DEFLATE 알고리즘 또한 다루고 있습니다. 강좌에서는 NO_COMPRESSION, FIXED_HUFFMAN_CODE
// 에 대해서는 다루지 않지만, 이 코드와 https://datatracker.ietf.org/doc/html/rfc1951 를 참고하시면 됩니다.
// zlib.js 는 fbx.js 에서 또한 사용됩니다.
//

import { DataType, TextEncoding } from "./FileStream.js";


const lengthBits = [
    0,0,0,0,  0,0,0,0,  1,1,1,1,  // 257,258,259,260,  261,262,263,264,  265,266,267,268
    2,2,2,2,  3,3,3,3,  4,4,4,4,  // 269,270,271,272,  273,274,275,276,  277,278,279,280,
    5,5,5,5,  0                   // 280,281,283,284,  285
];
const lengthBase = [
    3,  4,  5,  6,    7, 8, 9, 10,  11,13,15,17,  // 257,258,259,260,  261,262,263,264,  265,266,267,268
    19, 23, 27, 31,   35,43,51,59,  67,83,99,115, // 269,270,271,272,  273,274,275,276,  277,278,279,280,  
    131,163,195,227,  258                         // 280,281,283,284,  285
];
const distanceBits = [
    0, 0, 0, 0,   1, 1,2,2,  3,3,4, 4,  // 0, 1, 2, 3,   4, 5, 6, 7,   8, 9, 10,11,
    5, 5, 6, 6,   7, 7,8,8,  9,9,10,10, // 12,13,14,15,  16,17,18,19,  20,21,22,23,
    11,11,12,12,  13,13                 // 24,25,26,27,  28,29
];
const distanceBase = [
    1,   2,   3,   4,      5,    7,  9,  13,   17,  25,  33,  49,   // 0, 1, 2, 3,   4, 5, 6, 7,   8, 9, 10,11,
    65,  97,  129, 193,    257,  385,513,769,  1025,1537,2049,3073, // 12,13,14,15,  16,17,18,19,  20,21,22,23,
    4097,6145,8193,12289,  16385,24577                              // 24,25,26,27,  28,29
];
const codeLengthOrder = [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];

const NO_COMPRESSION       = 0b00; // 00 - no compression
const FIXED_HUFFMAN_CODE   = 0b01; // 01 - compressed with fixed Huffman codes
const DYNAMIC_HUFFMAN_CODE = 0b10; // 10 - compressed with dynamic Huffman codes
const ERROR                = 0b11; // 11 - reserved (error)


/** BitStream 은 FileStream 의 내용을 byte 가 아닌 bit 단위로 읽을 수 있게 해줍니다. */
export class BitStream {
    #stream;
    #data;
    #size;

    #chunk;
    #readBytes;


    /** FileStream 으로부터 bit 를 읽어들이는 BitStream 을 생성합니다. PNG 파일을 읽는 경우,
     * 
     *  encoder 가 zlib datastream 을 어떻게 쪼갤지 정해져있지 않습니다. 즉 현재 읽고 있는 
     * 
     *  IDAT chunk data 에, end-of-block 코드가 없을 수 있다는 의미입니다. 이 과정을 BitStream
     * 
     *  이 자동으로 처리하도록 하고 싶다면, 처음으로 읽은 IDAT 의 PNGChunk 를 넘겨주시길 바랍니다.
     */
    constructor(filestream, idatChunk = null) {
        this.#stream = filestream; // FileStream
        this.#data   = 0;          // 버퍼링된 bits (최대 32 개)
        this.#size   = 0;          // 버퍼링된 bit 들의 갯수

        this.#readBytes = 0;         // 읽은 바이트 갯수
        this.#chunk     = idatChunk; // IDAT 청크의 참조.
    }


    /** bitCount 만큼 bit 를 추출합니다. 결과는 Uint32 입니다. 이는 C++ 과 달리 JS 는 >> 연산자가
     * 
     *  32 bit 정수에만 정의되기 때문입니다. 만약 a >> 40 처럼 하게 되면, 우측 피연산자는 32 로 나눈
     * 
     *  나머지가 되어 a >> 8 이라는 잘못된 결과가 나오게 됩니다.*/
    read(bitCount) {
        
        if(bitCount <= 0) { // bitCount 가 0 이하라면,
            return 0;       // 0을 돌려준다.
        }
        if(this.#size < bitCount) {
            const extraBits = (bitCount - this.#size + 7) & -8; // bitCount 보다 큰 8의 배수가 되도록 한다.
            const byteCount = extraBits / 8;                    // 읽어들일 byte 의 갯수.

            for(let i=0; i<byteCount; ++i, this.#size += 8) {

                if(this.#chunk && this.#readBytes == this.#chunk.length) {        // PNG 파일의 IDAT 청크를 읽는 경우를 처리.
                    const CRC    = this.#stream.read(DataType.Uint32);            // 현재 chunk 의 CRC 를 읽어준다.
                    const length = this.#stream.read(DataType.Uint32, false);     // 다음 chunk 의 length 를 읽는다.
                    const type   = this.#stream.readString(TextEncoding.Utf8, 4); // 현재 chunk 의 type 을 읽는다.

                    this.#chunk.length = length; // IDAT 청크는 연속적으로 등장하기 때문에,
                    this.#readBytes    = 0;      // 다른 청크들은 끼어들 수 없음이 보장됨.
                }
                const read = this.#stream.read(DataType.Uint8);
                this.#data |= (read << this.#size);
                this.#readBytes++;
            }
        }
        const ret = this.#data & (-1 >>> (32 - bitCount)); // 읽을 bit 들만 걸러낸다.
        this.#data >>>= bitCount;                          // 읽은 bit 들은 버린다.
        this.#size -= bitCount;                            // 읽은 bit 갯수만큼 size 감수.

        return ret;
    }


    /** FileStream 을 돌려줍니다. */
    get filestream() { return this.#stream; }


    /** BitStream 에 버퍼링되어 있는 bit 들의 갯수를 얻습니다. size % 8 == 0 이라면, byte 의 경계(boundary)까지 읽었음을 의미합니다. */
    get size() { return this.#size; }
};


/** HuffmanTree 는  */
export class HuffmanTree {
    #tree = [];


    /** symbol 을 삽입합니다. */
    insert(symbol, code, codeLength) {
        let cur  = 0;                 // 루트 노드의 인덱스
        let size = this.#tree.length; // 현재 tree 의 크기

        for(let i=codeLength-1; i>=0; --i) {
            const dir = (code >>> i) & 1;

            if(this.#tree[cur].symbol != -1) { // 현재 노드는 non-leaf 가 될 수 없으며,
                throw "CodeIsNotPrefixFree";   // 그렇다면 code 가 prefix-free 가 아니라는 의미 (Error).
            }
            if(this.#tree[cur].link[dir] == -1) {
                this.#tree.push({ symbol : -1, link: [-1, -1] }); // 다음 node 가 아직 할당되지 않았다면
                this.#tree[cur].link[dir] = size++;               // 다음 node 를 삽입한다.
            }
            cur = this.#tree[cur].link[dir];
        }
        this.#tree[cur].symbol = symbol;
    }


    /** Dynamic HuffmanTree 를 생성하고 초기화합니다. */
    constructDynamic(firstSymbol, codeLengths, codeLengthsCount) {
        const blcount  = new Int32Array(16); // deflate 에서는, code 의 최대 길이는 15 이다.
        const nextcode = new Int32Array(16); // deflate 에서는, code 의 최대 길이는 15 이다.
        let   maxbits  = 1;
        let   code     = 0;

        // 1) Count the number of codes for each code length. Let
        //    bl_count[N] be the number of codes of length N, N >= 1.
        for (let i = 0; i < codeLengthsCount; ++i) {
            const length = codeLengths[i];
            blcount[length]++;

            if (maxbits < length) {
                maxbits = length;
            }
        }

        // 2) Find the numerical value of the smallest code for each code length:
        blcount[0] = 0;

        for (let i = 1; i <= maxbits; ++i) {
            code = (code + blcount[i - 1]) << 1;
            nextcode[i] = code;
        }

        // 3) Assign numerical values to all codes, using consecutive values
        //    for all codes of the same length with the base values determined
        //    at step 2. Codes that are never used (with have a bit length of zero)
        //    must not be assigned a value.
        this.#tree.length = 0;
        this.#tree.push({ symbol : -1, link: [-1, -1] }); // root node 를 삽입.


        for (let i = 0; i < codeLengthsCount; ++i) {
            const length = codeLengths[i];
            if (0 < length) {
                this.insert(firstSymbol + i, nextcode[length], length);
                nextcode[length]++;
            }
        }
    }


    /** Fixed HuffmanTree 를 생성하고 초기화합니다. distance = false 를 넘겨주면
     * 
     *  literal/length 문자를 위한 fixed huffman code tree 를 생성합니다. 이외의 경우
     * 
     *  distance 문자를 위한 fixed huffman code tree 를 생성합니다.
    */
    constructFixed(distance=false) {
        this.#tree.length = 0;
        this.#tree.push({ symbol : -1, link: [-1, -1] }); // root node 를 삽입.
        
        // literal/length symbol 들을 위한 fixed huffman code tree 를 초기화한다.
        if(distance == false) {
            
            for (let symbol = 0, code= 0b00110000; symbol < 144; ++symbol, ++code) {
                this.insert(symbol, code, 8);
            }
            for (let symbol = 144, code = 0b110010000; symbol < 256; ++symbol, ++code) {
                this.insert(symbol, code, 9);
            }
            for (let symbol = 256, code = 0b0000000; symbol < 280; ++symbol, ++code) {
                this.insert(symbol, code, 7);
            }
            for (let symbol = 280, code = 0b11000000; symbol < 288; ++symbol, ++code) {
                this.insert(symbol, code, 8);
            }
            return;
        }


        // distance symbol 들을 위한 fixed huffman code tree 를 초기화한다.
        for (let symbol = 0, code = 0b00000; symbol < 32; ++symbol, ++code) {
            this.insert(symbol, code, 5);
        }
    }


    /** Bitstream 으로부터 huffman code 하나를 읽고, symbol 을 찾아 돌려줍니다. */
    readSymbol(bitstream) {
        let cur = this.#tree[0];

        // cur 이 non-leaf node 일때까지 반복한다.
        while(cur.symbol == -1) {
            const dir   = bitstream.read(1); // Huffman codes are packed starting with the most-significant
            const index = cur.link[dir];     // bit of the code (i.e., with the first bit of the code in the relative LSB position).

            if(index == -1) {
                throw "InvalidHuffmanCode";
            }
            cur = this.#tree[index];
        }
        return cur.symbol;
    }
};


/** OutputStream 은  */
class OutputStream {
    #uint8Array;
    #length;

    constructor(uint8Array) { 
        this.#uint8Array = uint8Array; 
        this.#length     = 0; 
    }

    push(value) { this.#uint8Array[this.#length++] = value; }

    at(index) { return this.#uint8Array[index]; }

    get length() { return this.#length; }
};


const hclenTree = new HuffmanTree(); // `code length` symbol 들을 위한 huffman code tree
const hlitTree  = new HuffmanTree(); // `literal/length` symbol 들을 위한 huffman code tree
const hdistTree = new HuffmanTree(); // `distance` symbol 들을 위한 huffman code tree

const fhlitTree = new HuffmanTree(); // `literal/length` symbol 들을 위한 fixed huffman code tree
const fdistTree = new HuffmanTree(); // `distacne` symbol 들을 위한 fixed huffman code tree

const codeLengthsClen      = new Uint32Array(19);       // 
const codeLengthsHlitHdist = new Uint32Array(286 + 32); // 

fhlitTree.constructFixed(false); // 
fdistTree.constructFixed(true);  // 



/** zlib data stream 의 압축을 해제하여, uint8Array 에 담아줍니다. inflate 함수의 caller 가
 * 
 *  압축을 해제한 결과물의 크기를 알고 있다는 가정하에, uint8Array 는 충분한 크기로 할당되어 있다 생각합니다. */
export function inflate(bitstream, uint8Array) {
    const bin    = bitstream;                    // bit input stream
    const output = new OutputStream(uint8Array); // output stream

    bin.read(8); // compression method (zlib-header)
    bin.read(8); // additional flag (zlib-header)

    let bfinal = 0; // if set, this is the last block of the data set.
    let btype  = 0; // specifies how the data are compressed.

    do {                      // Each block of compressed data begins with 3 header bits.
        bfinal = bin.read(1); // the header bits do not necessarily begin on a byte boundary,
        btype  = bin.read(2); // since a block does not necessarily occupy an integral number of bytes.

        switch(btype) {

            case NO_COMPRESSION: {
                const ignored = bin.read(bin.size % 8); // Any bits of input up to the next byte boundary are ignored.
                const len     = bin.read(16);           // LEN is the number of data bytes in the block.
                const nlen    = bin.read(16);           // NLEN is the one's complement of LEN

                if((len & ~nlen) != len) {
                    throw `LEN (=${len.toString(16)})은 NLEN (=${nlen.toString(16)})의 보수이어야 합니다.`;
                }
                for(let i=0; i<len; ++i) {
                    output.push(bin.read(8)); // LEN bytes of literal data...
                }
                break;
            }
            case FIXED_HUFFMAN_CODE: {
                decodeLZ77(fhlitTree, fdistTree, bin, output);
                break;
            }
            case DYNAMIC_HUFFMAN_CODE: {
                const hlit  = bin.read(5) + 257; // Number of Literal/Length codes (257 - 286)
                const hdist = bin.read(5) + 1;   // Number of Distance codes       (1 - 32)
                const hclen = bin.read(4) + 4;   // Number of Code Length codes    (4 - 19)

                codeLengthsClen.fill(0);
                codeLengthsHlitHdist.fill(0);

                for (let i = 0; i < hclen; ++i) {         // (HCLEN + 4) x 3 bits: code lengths for the code length alphabet
                    const index = codeLengthOrder[i];     // given just above, in the `code_length_order`.
                    codeLengthsClen[index] = bin.read(3); // These code lengths are interpreted as 3-bit integers (0-7); as above,                 
                }                                         // a code length of 0 means the corresponding symbol (literal/length
                                                          // or distance code length) is not used.

                hclenTree.constructDynamic(0, codeLengthsClen, 19); // constructs the tree for the code length Huffman code

                for (let i = 0; i < (hlit + hdist); ) {       // The code length repeat codes can cross from HLIT + 257 to the HDIST + 1 code lengths.
                    const symbol = hclenTree.readSymbol(bin); // In other words, all code lengths form a single sequence of HLIT + HDIST + 258 values.

                    if (symbol < 16) {
                        codeLengthsHlitHdist[i++] = symbol; // Represent code lengths of 0 - 15
                    }
                    else if (symbol == 16) {                            // Copy the previous code length 3 - 6 times.
                        const prevSymbol = codeLengthsHlitHdist[i - 1]; // The next 2 bits indicate repeat length (0 = 3, ... , 3 = 6)
                        const repeat      = bin.read(2) + 3;            // Example: Codes 8, 16 (+2 bits 11), 16 (+2 bits 10)     
                                                                        //          will expand to 12 code lengths of 8 (1 + 6 + 5)
                        for (let j = 0; j < repeat; ++j) {
                            codeLengthsHlitHdist[i++] = prevSymbol;
                        }
                    }
                    else if (symbol == 17) {
                        const repeat = bin.read(3) + 3; // Repeat a code length of 0 for 3 - 10 times.
                        i += repeat;                    // (3 bits of length)
                    }
                    else if (symbol == 18) {
                        const repeat = bin.read(7) + 11; // Repeat a code length of 0 for 11 - 138 times
                        i += repeat;                     // (7 bits of length)
                    }
                }

                hlitTree.constructDynamic(0, codeLengthsHlitHdist, hlit);               // constructs the tree for the literal/length Huffman code
                hdistTree.constructDynamic(0, codeLengthsHlitHdist.slice(hlit), hdist); // constructs the tree for the distance Huffman code

                decodeLZ77(hlitTree, hdistTree, bin, output);
                break;
            }
            default: {
                throw `btype : ${btype} (ERROR)`;
            }
        };


    } while(bfinal == 0); // while not last block

    bin.filestream.read(DataType.Uint32); // zlib check value (zlib-footer)
}


/** 인자로 받은 literal/length, distance huffman code tree 를 가지고
 * 
 *  LZ77 압축을 해제합니다. 압축을 해체한 byte 들은 out 에 순서대로 저장됩니다.
 */
function decodeLZ77(hlitTree, hdistTree, bin, output) {

    // The actual compressed data of the block, encoded using the 
    // literal/length and distance Huffman codes. while not last block.
    while(true) {
        const value = hlitTree.readSymbol(bin); // decode literal/length value from input stream

        if(value < 256) {
            output.push(value); // copy value (literal byte) to output stream.
        }
        else if(value == 256) { // end of block.
            break;              // break from loop.
        }
        else if (value > 256) {
            const lengthCode   = value - 257;                           // decode distance from input stream.
            const lengthOffset = bin.read(lengthBits[lengthCode]);      // move backwards distance bytes in the output stream,
            const length       = lengthBase[lengthCode] + lengthOffset; // and copy length bytes from this position to the output stream.

            const distanceCode   = hdistTree.readSymbol(bin);                   // a duplicated string reference may refer to a string in a previous block; i.e.,
            const distanceOffset = bin.read(distanceBits[distanceCode]);        // the backward distance may cross one or more block boundaries. However a distance
            const distance       = distanceBase[distanceCode] + distanceOffset; // cannot refer past the beginning of the output stream.

            const refStr = output.length - distance; 
                                                    // the referenced string may overlap the current position; for example,
            for (let i = 0; i < length; ++i) {      // if the last 2 bytes decoded have values X and Y, a string reference with
                output.push(output.at(refStr + i)); // <length = 5, distance = 2> adds X,Y,X,Y,X to the output stream.
            }
        }
    }
}