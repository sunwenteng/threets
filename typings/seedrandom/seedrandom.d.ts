// Type definitions for seedrandom 2.4.0
// Project: https://github.com/davidbau/seedrandom
// Definitions by: Nigel <https://github.com/nigel0913>
// Definitions: xxx

declare module 'seedrandom' {

    function seedrandom(seed?:string, options?:any): seedrandom.ARC4Function;

    module seedrandom {

        function xor128(seed?:string, options?:any): xor128Function;
        function xorwow(seed?:string, options?:any): xorwowFunction;
        function xorshift7(seed?:string, options?:any): xorshift7Function;
        function xor4096(seed?:string, options?:any): xor4096Function;
        function tychei(seed?:string, options?:any): tycheiFunction;

        interface ARC4Function {
            ():number;
            state: { ():{i:number; j:number; S:number[]} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
        interface xor128Function {
            ():number;
            state: { ():{x:number; y:number; z:number; w:number} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
        interface xorwowFunction {
            ():number;
            state: { ():{x:number; y:number; z:number; w:number; v:number; d:number} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
        interface xorshift7Function {
            ():number;
            state: { ():{x:number[]; i:number;} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
        interface xor4096Function {
            ():number;
            state: { ():{i:number; w:number; X:number[]} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
        interface tycheiFunction {
            ():number;
            state: { ():{a:number[]; b:number; c:number; d:number} };
            int32: { ():number };
            quick: { ():number };
            double: { ():number };
        }
    }
    export = seedrandom;
}