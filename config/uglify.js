module.exports = {
    options: {
        // 可以尝试加入git信息
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd_hh:MM:ss") %> */\n\n' +
        '/*! git info\n' +
        ' * Current HEAD SHA: <%= gitinfo.local.branch.current.SHA %> \n' +
        ' * Current branch name: <%= gitinfo.local.branch.current.name %> \n' +
        ' * Last commit time: <%= gitinfo.local.branch.current.lastCommitTime %> \n' +
        ' * Last commit author: <%= gitinfo.local.branch.current.lastCommitAuthor %> \n' +
        '*/\n'
    },
    origin_js: {
        option: {
            sourceMap: true,
            mangle: true
        },
        files: {
            "release/src/share/cmd.js": ['bin/src/share/cmd.js'],
            "release/src/share/db.js": ['bin/src/share/db.js']
        }
    },
    ts_js: {
        options: {
            sourceMap: true,
            sourceMapIncludeSources:true,
            sourceMapIn: function (file) {
                console.log(file);
                return file + '.map';
            },
            exceptionsFiles: ['uglify-reserved.json']
        },
        files: [{
            expand: true,
            cwd: 'bin/',
            src: ['src/**/*.js', 'index.js', '!src/**/share/**', '!src/test/**', '!src/shell/**'],
            dest: 'release'
        }]
    }
};