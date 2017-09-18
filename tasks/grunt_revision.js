module.exports = function (grunt, options) {
    grunt.registerTask('gitDescribe', function () {
        grunt.event.once('git-describe', function (rev) {
            grunt.log.ok("Git Describe: " + rev.toString());
            grunt.config.set('gitDescribe', rev.toString());
        });
        grunt.task.run('git-describe');
    });

    grunt.registerTask('write-git', 'Write git info production', function () {
        var gitinfo  = grunt.config.get('gitinfo');
        var describe = grunt.config.get('gitDescribe');
        var content  = {};
        content.type = 'git';
        var branch   = content.branch = {};
        [
            'name', 'SHA', 'shortSHA', 'lastCommitTime', 'lastCommitMessage', 'lastCommitAuthor', 'lastCommitNumber'
        ].forEach(function (key) {
            var value = gitinfo.local.branch.current[key];
            if (value.length > 1 && value[0] === '"' && value[value.length - 1] === '"') {
                value = value.slice(1, -1);
            }
            if (value[value.length - 1] === '\n') {
                value = value.slice(0, -1);
            }
            branch[key] = value;
        });
        content.describe = describe;
        grunt.file.write('compile/obj/revision.json', JSON.stringify(content, null, 2));
    });
};