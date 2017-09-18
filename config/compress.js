module.exports = {
    debug: {
        options: {
            archive: 'compile/<%=pkg.name%>@<%=gitDescribe%>.tar.gz',
            mode: 'tgz'
        },
        files: [
            {
                expand: true,
                cwd: 'compile/debug',
                src: ['**'],
                dest: '<%=pkg.name%>@<%=gitDescribe%>'
            }
        ]
    },

    "docker-release": {
        options: {
            archive: 'compile/docker/<%=pkg.name%>.tar.gz',
            mode: 'tgz'
        },
        files: [
            {
                expand: true,
                cwd: 'compile/release',
                src: ['**'],
                dest: '<%=pkg.name%>@<%=gitDescribe%>'
            }
        ]
    },

    data: {
        options: {
            archive: 'compile/dh-config-<%=svn_info_data.branch%>@<%=svn_info_data.revision%>.tar.gz',
            mode: 'tgz'
        },
        files: [
            {
                expand: true,
                cwd: 'compile/data',
                src: ['**'],
                dest: 'data'
            }
        ]
    }

};