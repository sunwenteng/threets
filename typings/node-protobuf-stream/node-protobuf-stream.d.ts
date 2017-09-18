/// <reference path="../node/node.d.ts" />

declare module "node-protobuf-stream" {

    import stream = require("stream");

    interface Options {
        limit_buffer_size:number;
        header_32_bit:boolean;
    }

    interface Callback {
        (err):void;
    }

    export class Serializer extends stream.Transform {
        static wrapMessage(message:any):Buffer;
    }

    export class Parser extends stream.Transform {
        static unwrapBuffer(message:Buffer):any;
    }

    //function setWrap():void;
    //function setUnwrap():void;

    function initStream(dirOrFile:string,
                        options?:Options,
                        done?:Callback):void;

    function resetStream():void;

    function get(pkgName?:string):any;

    //function getLimitBufferSize():void;
    //function getHeaderSize():void;

}