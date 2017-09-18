module.exports = function (grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    //grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks('grunt-gitinfo');
    //grunt.loadNpmTasks('grunt-svn-info');
    //grunt.loadNpmTasks('grunt-git-describe');

    var configs = require('load-grunt-configs')(grunt);
    grunt.initConfig(configs);
    grunt.config.set('pkg', grunt.file.readJSON('package.json'));

    grunt.loadTasks('./tasks');

    //try {
    //    grunt.config.set('publish', grunt.file.readJSON('publish.json'));
    //} catch (err) {
    //    grunt.log.writeln('read publish.json error: ' + err.message);
    //}

    grunt.registerTask('compile_debug', [
        "clean:compile_obj",
        "clean:compile_debug",
        "shell:compile_protobuf_server",
        "copy:origin_js_to_obj",
        "ts:compile_dh_server",
        "write-package.json",
        "gitinfo",
        "shell:git-describe",
        "write-git",
        "copy:debug"
    ]);

    grunt.registerTask('compile_release', [
        "clean:compile_obj",
        "clean:compile_release",
        "shell:compile_protobuf_server",
        "copy:ts_source_to_release",
        "copy:origin_js_to_obj",
        "ts:release_compile",
        "write-package.json",
        "gitinfo",
        "shell:git-describe",
        "write-git",
        "copy:release"
    ]);

    grunt.registerTask('write_revision', [
        'gitinfo',
        "shell:git-describe",
        'write-git'
    ]);

    grunt.registerTask('release', [
        'compile_debug',
        'compress:debug'
    ]);

    grunt.registerTask('docker_build', [
        'compile_release',
        'compress:docker-release',
        'copy:docker-file',
        'shell:docker_build'
    ]);

    grunt.registerTask('image_push', [
        "shell:git-describe",
        "shell:push_docker_image"
    ]);

    grunt.registerTask('pub_config', function (branch, revision) {
        grunt.task.run([
            'clean:compile_data',
            'svn-export-data:compile/data:' + branch + ':' + (revision ? revision : ''),
            'compress:data'
        ]);
    });

    grunt.registerTask('update_client_share', [
        "shell:compile_protobuf_client",
        'copy:client_share'
    ]);

};