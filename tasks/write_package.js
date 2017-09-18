module.exports = function (grunt, options) {
    grunt.registerTask('write-package.json', 'Write package.json production', function () {
        var pkg = grunt.file.readJSON('./package.json');
        var content = {};

        [
            'name',
            'version',
            'licenses',
            'private',
            'preferGlobal',
            'main',
            'bin',
            'engines',
            'dependencies',
            'scripts'

        ].forEach(function (key) {
            content[key] = pkg[key];
        });

        grunt.file.write('./compile/obj/package.json', JSON.stringify(content, null, 2));
    });
};