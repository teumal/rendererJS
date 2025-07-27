
import {Vector2, Vector3, Vector4, Quaternion} from "../Core/MyMath.js";

const dataSizes       = [ 4,8,4,1,2,  8,1,2,4,8,  16,24,32,  8,12,16 ];
const utf8Decoder     = new TextDecoder("utf-8");
const utf16Decoder    = new TextDecoder("utf-16le");
const shiftJisDecoder = new TextDecoder("shift-jis");


/** FileStream.read 에서 읽은 자료형을 명시하는 열거형입니다. */
export const DataType = {
    Float  : 0,
    Double : 1,
    Int32  : 2,
    Int8   : 3,
    Int16  : 4,
    Int64  : 5,
    Uint8  : 6,
    Uint16 : 7,
    Uint32 : 8,
    Uint64 : 9,
    Vec2   : 10,
    Vec3   : 11,
    Vec4   : 12,
    Vec2f  : 13,
    Vec3f  : 14,
    Vec4f  : 15,
};


/** FileStream.readString 에서 text encoding 을 명시하는 열거형입니다. */
export const TextEncoding = {
    Utf8     : 0, 
    Utf16le  : 1,
    ShiftJis : 2,
};


/** DataType 의 byte 갯수를 얻습니다 (e.g. sizeof(DataType.Float) == 4) */
export function sizeof(dataType) { return dataSizes[dataType]; }



/** FileStream 은 C++ style 처럼 동기식(synchronously)으로 파일을 읽도록 도와줍니다. */
export class FileStream {
    static #toString  = [ toUtf8String, toUtf16String, toShiftJisString ];
    static #converter = [ toFloat, toDouble, toInt32, toInt8, toInt16, toInt64, toUint8, toUint16, toUint32, toUint64, toVector2, toVector3, toVector4, toVector2f, toVector3f, toVector4f ];

    #readBytes;
    #arrayBuffer;


    /** File.arrayBuffer() 를 읽는 FileStream 을 생성합니다. raw binary data buffer 를 나타낼 수 있다면
     * 
     *  모두 파일로 생각하기에 임의의 ArrayBuffer 또는 TypedArray 를 읽는 것 또한 가능합니다. */
    constructor(arrayBufferOrTypedArray) {

        if(arrayBufferOrTypedArray instanceof ArrayBuffer) {
            this.#arrayBuffer = arrayBufferOrTypedArray;
            this.#readBytes   = 0;
        }
        else {
            this.#arrayBuffer = arrayBufferOrTypedArray.buffer;
            this.#readBytes   = arrayBufferOrTypedArray.byteOffset;
        }
    }


    /** stream 에서 dataType 의 크기 만큼 byte 를 추출합니다. 추출한 byte 들을 dataType 으로 재해석하여 돌려줍니다.
     * 
     *  결과는 number, bigint, Vector2, Vector3, Vector4 중 하나입니다. 추출한 byte 갯수만큼 readBytes 가 증가합니다.
     * 
     *  littleEndian = false 라면, 추출한 byte 들이 big endian 순서로 저장되어 있었다고 생각합니다. */
    read(dataType=DataType.Uint8, littleEndian=true) {
        const ret = FileStream.#converter[dataType](this.#arrayBuffer, this.#readBytes, littleEndian);
        this.#readBytes += sizeof(dataType);
        return ret;
    }


    /** stream 에서 byteCount 만큼 byte 를 추출합니다. 추출한 byte 들을 textEncoding 으로 인코딩된 문자열로 재해석하여 돌려줍니다.
     * 
     *  결과는 string 입니다. byteCount 만큼 readBytes 가 증가합니다. */
    readString(textEncoding, byteCount) {
        const ret = FileStream.#toString[textEncoding](this.#arrayBuffer, this.#readBytes, byteCount);
        this.#readBytes += byteCount;
        return ret;
    }


    /** stream 에서 byteCount 만큼 byte 를 추출하고 폐기합니다. byteCount 만큼 readBytes 가 증가합니다. */
    ignore(byteCount) { this.#readBytes += byteCount; }


    /** 현재까지 읽은 byte 의 갯수. FileStream 이 다음에 읽을 byte 의 위치(byteOffset)이기도 합니다. */
    get readBytes() { return this.#readBytes; }
};




/** arrayBuffer 에 저장된 바이트들을 Float32 로 해석하여 돌려줍니다. */
export function toFloat(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getFloat32(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 Float64 로 해석하여 돌려줍니다. */
export function toDouble(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getFloat64(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 Int8 로 해석하여 돌려줍니다. */
export function toInt8(arrayBuffer, byteOffset=0) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getInt8(byteOffset);
}


/** arrayBuffer 에 저장된 바이트들을 Int16 으로 해석하여 돌려줍니다. */
export function toInt16(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getInt16(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 Int32 로 해석하여 돌려줍니다. */
export function toInt32(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getInt32(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 BigInt64 로 해석하여 돌려줍니다. */
export function toInt64(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getBigInt64(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 Uint8 로 해석하여 돌려줍니다. */
export function toUint8(arrayBuffer, byteOffset=0) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getUint8(byteOffset);
}


/** arrayBuffer 에 저장된 바이트들을 Uint16 으로 해석하여 돌려줍니다. */
export function toUint16(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getUint16(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 Uint32 로 해석하여 돌려줍니다. */
export function toUint32(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getUint32(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 BigInt64 로 해석하여 돌려줍니다. */
export function toUint64(arrayBuffer, byteOffset=0, littleEndian=true) {
    const dataView = new DataView(arrayBuffer);
    return dataView.getBigUint64(byteOffset, littleEndian);
}


/** arrayBuffer 에 저장된 바이트들을 UTF-16 으로 인코딩된 string 으로 해석하여 돌려줍니다. */
export function toUtf16String(arrayBuffer, byteOffset=0, length=0) {
    const dataView = new DataView(arrayBuffer, byteOffset, length);
    return utf16Decoder.decode(dataView);
}


/** arrayBuffer 에 저장된 바이트들을 UTF-8 로 인코딩된 string 으로 해석하여 돌려줍니다. */
export function toUtf8String(arrayBuffer, byteOffset=0, length=0) {
    const dataView = new DataView(arrayBuffer, byteOffset, length);
    return utf8Decoder.decode(dataView);
}


/** arrayBuffer 에 저장된 바이트들을 Shift-jis 로 인코딩된 string 으로 해석하여 돌려줍니다. */
export function toShiftJisString(arrayBuffer, byteOffset=0, length=0) {
    const dataView = new DataView(arrayBuffer, byteOffset, length);
    return shiftJisDecoder.decode(dataView);
}


/** arrayBuffer 에 저장된 바이트들을 Vector2 로 해석하여 돌려줍니다. 각 성분들은 Float32 라고 생각합니다. */
export function toVector2f(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toFloat(arrayBuffer, byteOffset, littleEndian);
    const y = toFloat(arrayBuffer, byteOffset+4, littleEndian);
    return new Vector2(x,y);
}


/** arrayBuffer 에 저장된 바이트들을 Vector3 로 해석하여 돌려줍니다. 각 성분들은 Float32 라고 생각합니다. */
export function toVector3f(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toFloat(arrayBuffer, byteOffset, littleEndian);
    const y = toFloat(arrayBuffer, byteOffset+4, littleEndian);
    const z = toFloat(arrayBuffer, byteOffset+8, littleEndian);
    return new Vector3(x,y,z);
}


/** arrayBuffer 에 저장된 바이트들을 Vector4 로 해석하여 돌려줍니다. 각 성분들은 Float32 라고 생각합니다. */
export function toVector4f(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toFloat(arrayBuffer, byteOffset, littleEndian);
    const y = toFloat(arrayBuffer, byteOffset+4, littleEndian);
    const z = toFloat(arrayBuffer, byteOffset+8, littleEndian);
    const w = toFloat(arrayBuffer, byteOffset+12, littleEndian);
    return new Vector4(x,y,z,w);
}


/** arrayBuffer 에 저장된 바이트들을 Vector2 로 해석하여 돌려줍니다. 각 성분들은 Double 이라고 생각합니다. */
export function toVector2(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toDouble(arrayBuffer, byteOffset, littleEndian);
    const y = toDouble(arrayBuffer, byteOffset+8, littleEndian);
    return new Vector2(x,y);
}


/** arrayBuffer 에 저장된 바이트들을 Vector3 로 해석하여 돌려줍니다. 각 성분들은 Double 이라고 생각합니다. */
export function toVector3(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toDouble(arrayBuffer, byteOffset, littleEndian);
    const y = toDouble(arrayBuffer, byteOffset+8, littleEndian);
    const z = toDouble(arrayBuffer, byteOffset+16, littleEndian);
    return new Vector3(x,y,z);
}


/** arrayBuffer 에 저장된 바이트들을 Vector4 로 해석하여 돌려줍니다. 각 성분들은 Double 이라고 생각합니다. */
export function toVector4(arrayBuffer, byteOffset=0, littleEndian=true) {
    const x = toDouble(arrayBuffer, byteOffset, littleEndian);
    const y = toDouble(arrayBuffer, byteOffset+8, littleEndian);
    const z = toDouble(arrayBuffer, byteOffset+16, littleEndian);
    const w = toDouble(arrayBuffer, byteOffset+24, littleEndian);
    return new Vector4(x,y,z,w);
}


/** BitConverter 함수들을 테스트합니다. */
export function example() {
    const float    = new Uint8Array([0xd8, 0xf, 0x49, 0x40]).buffer;
    const double   = new Uint8Array([0, 0, 0, 0, 0xfb, 0x21, 0x9, 0x40]).buffer;
    const utf8str  = new Uint8Array([0xec, 0x95, 0x88, 0xeb, 0x87, 0xbd, 0]).buffer;
    const utf16str = new Uint8Array([0x52, 0xD8, 0x62, 0xDF]).buffer;
    
    const int8  = new Uint8Array([0xfe]).buffer;
    const uint8 = new Uint8Array([0xfe]).buffer;

    const int16  = new Uint8Array([0xf0, 0xff]).buffer;
    const uint16 = new Uint8Array([0xf0, 0xff]).buffer;

    const int32  = new Uint8Array([0xf0, 0xff, 0xff, 0xff]).buffer;
    const uint32 = new Uint8Array([0xf0, 0xff, 0xff, 0xff]).buffer;

    const int64  = new Uint8Array([0xf0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).buffer;
    const uint64 = new Uint8Array([0xf0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).buffer;

    console.log(toFloat(float));                                  // 3.141592025756836
    console.log(toDouble(double));                                // 3.141592025756836
    console.log(toUtf8String(utf8str, 0, utf8str.byteLength));    // 안뇽
    console.log(toUtf16String(utf16str, 0, utf16str.byteLength)); // 𤭢

    console.log(toInt8(int8));   // -2
    console.log(toUint8(uint8)); // 254

    console.log(toInt16(int16));   // -16
    console.log(toUint16(uint16)); // 65520

    console.log(toInt32(int32));   // -16
    console.log(toUint32(uint32)); // 4294967280

    console.log(toInt64(int64));   // -16n
    console.log(toUint64(uint64)); // 18446744073709551600n
}