module.exports = {
    // use to override the default options, See: http://gruntjs.com/configuring-tasks#options
    // these are the default options to the typescript compiler for grunt-ts:
    // see `tsc --help` for a list of supported options.
    options: {
        compile      : true,                // perform compilation. [true (default) | false]
        comments     : false,               // same as !removeComments. [true | false (default)]
        sourceMap    : true,                // generate a source map for every output js file. [true (default) | false]
        declaration  : false,               // generate a declaration .d.ts file for every output js file. [true | false (default)]
        noImplicitAny: false,               // set to true to pass --noImplicitAny to the compiler. [true | false (default)]
        fast         : "never"              // see https://github.com/TypeStrong/grunt-ts/blob/master/docs/fast.md ["watch" (default) | "always" | "never"]
        /* ,compiler: './node_modules/grunt-ts/customcompiler/tsc'  */ //will use the specified compiler.
    },

    compile_dh_server: {
        src    : [
            "typings/tsd.d.ts",
            "lib/**/*.ts",
            '!lib/config/data/*.ts',
            '!lib/test/**'
        ],          // The source typescript files, http://gruntjs.com/configuring-tasks#files
        outDir : 'compile/obj',             // If specified, generate an out.js file which is the merged js file
        options: {
            target       : 'es5',           // target javascript language. [es3 | es5 (grunt-ts default) | es6]
            module       : 'commonjs',
            sourceRoot   : '',              // where to locate TypeScript files. [(default) '' == source ts location]
            mapRoot      : 'compile/obj'    // where to locate .map.js files. [(default) '' == generated js location.]
        }
    },

    release_compile: {
        src    : [
            "compile/release/**/*.ts"
        ],          // The source typescript files, http://gruntjs.com/configuring-tasks#files
        outDir : 'compile/release',             // If specified, generate an out.js file which is the merged js file
        options: {
            target       : 'es5',           // target javascript language. [es3 | es5 (grunt-ts default) | es6]
            module       : 'commonjs',
            sourceRoot   : '',              // where to locate TypeScript files. [(default) '' == source ts location]
            mapRoot      : ''    // where to locate .map.js files. [(default) '' == generated js location.]
        }
    }
};