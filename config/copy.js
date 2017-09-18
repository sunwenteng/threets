module.exports = {

    debug: {
        files: [
            {
                expand: true,
                cwd   : 'compile/obj',
                src   : [
                    '**/*.json',
                    '**/*.js',
                    '**/*.map',
                    'lib/**/*.node',
                    'lib/**/*.js',
                    'lib/completion/completion.sh',
                    '*.yml',
                    'binding.gyp',
                    'src/**/*.cc',
                    'src/**/*.cpp',
                    'src/**/*.h',

                    '!lib/config/data/**',
                    '!lib/test/**'
                ],
                dest  : 'compile/debug'
            }
        ]
    },

    release: {
        files: [
            {
                expand: true,
                cwd   : 'compile/obj',
                src   : [
                    '**/*.json',
                    '**/*.js',
                    '**/*.map',
                    'lib/**/*.node',
                    'lib/**/*.js',
                    'lib/completion/completion.sh',
                    '*.yml',
                    'binding.gyp',
                    'src/**/*.cc',
                    'src/**/*.cpp',
                    'src/**/*.h',

                    '!lib/config/data/**',
                    '!lib/test/**'
                ],
                dest  : 'compile/release'
            }
        ]
    },

    origin_js_to_obj: {
        files: [
            {
                expand: true,
                cwd   : './',
                src   : [
                    'bin/*.js',
                    'lib/**/*.js',
                    'lib/completion/completion.sh',
                    '*.yml',
                    'binding.gyp',
                    'src/**/*.cc',
                    'src/**/*.cpp',
                    'src/**/*.h',

                    '!lib/test'
                ],
                dest  : 'compile/obj'
            }
        ]
    },

    ts_source_to_release: {
        files: [
            {
                expand: true,
                cwd   : './',
                src   : [
                    "typings/**/*.d.ts",
                    "lib/**/*.ts",
                    "index.ts",
                    '!lib/config/data/*.ts',
                    '!lib/test/**'
                ],
                dest  : 'compile/release'
            }
        ]
    },

    client_share: {
        files: [
            {
                expand: true,
                cwd : 'lib/share/',
                src : [
                    'protobuf/api/*.proto',
                    'protobuf/cache/*.proto',
                    'protobuf/model/*.proto',
                    'protobuf/view/*.proto',
                    'protobuf/global.proto',
                    'protobuf/client_use.proto'
                ],
                dest: 'client_share/trunk/'
            }
        ]
    },

    "docker-file": {
        files: [
            {
                expand: true,
                cwd : '.',
                src : [
                    'Dockerfile'
                ],
                dest: 'compile/docker/'
            }
        ]
    }
};