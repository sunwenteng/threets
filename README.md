# DragonHunter

[TOC]

## 生成程序脚本压缩包

### Git克隆

从git检出工程库

``` bash
git clone http://ime/three/threets.git
git clone http://172.16.0.84/three/threets.git
```

### NPM包安装

```bash
npm install -g grunt-cli
npm install
```

### 运行Grunt任务

#### 生成代码包

	1. create file publish.json
	2. grunt publish:[config-key]
	3. new file location: archive/[config-key]/dh-xxx.tar.gz


publish.json demo

```json
{
    "IOS_TEST": {
        "name": "IOS_TEST",
        "git_branch": "dev",
        "res_revision": "6708",
        "svn_branch": "trunk"
    },
    "Dev": {
        "name": "Dev",
        "git_branch": "dev",
        "res_revision": "latest",
        "svn_branch": "trunk"
    },
    "uc": {
        "name": "uc",
        "git_branch": "1.1.0",
        "res_revision": 6972,
        "svn_branch": "1.1.0"
    },
    "uc_test": {
        "name": "uc_test",
        "git_branch": "dev",
        "res_revision": "6974",
        "svn_branch": "1.1.0"
    }
}
```

#### 生成 node_modules 包

运行下列指令，生成目录`archive/node_modules/node_modules.tar.gz`
```bash
grunt compress-node_modules
```

## 部署服务器

### 服务器环境

#### node

``` bash
apt-get update
apt-get install -y python-software-properties software-properties-common
add-apt-repository ppa:chris-lea/node.js
apt-get update
apt-get install nodejs
```

#### pm2

##### 安装

```bash
npm install -g pm2
```

##### PM2_HOME配置

原因：由于pm2默认使用用户目录下的.pm2文件夹作为指令执行配置，导致不同用户执行pm2指令不是同一个pm2配置。
方法：

	1. 设置系统profile：export PM2_HOME=/path/to/your/directory
	2. 设置sudo环境变量：
		1. vim /etc/sudoers
		2. Defaults env_keep += "PM2_HOME"

	3. 之后的pm2指令都需要sudo执行

参考：[Sudo_Environment_variables][]


#### redis

```bash
sudo apt-get install -y python-software-properties
sudo add-apt-repository -y ppa:rwky/redis
sudo apt-get update
sudo apt-get install -y redis-server
```

#### mysql
```bash
apt-get install mysql-server mysql-client libmysqlclient-dev
```

### 新服务器

#### GameServer

依赖列表：
- [Node](#node)
- [PM2](#pm2)
- [MySQL](#mysql)

#### CenterServer

依赖列表：
- [Node](#node)
- [PM2](#pm2)
- [MySQL](#mysql)

#### LoginServer

依赖列表：
- [Node](#node)
- [PM2](#pm2)
- [MySQL](#mysql)

#### RedisServer

依赖列表：
- [Redis](#redis)

### 更新现有服务器

对于 GameServer、CenterServer、LoginServer 只需要解压对应的包到改目录，然后执行以下命令重启服务器
```bash
cd [project_dir]
cd src/shell
./start_server -[lcg]  (l:LoginServer, c:CenterServer, g:GameServer)
```

## DH服务器代码更新流程

- grunt publish:xxx
- git shortlog --no-merges [branch] --not [last_commit]
- 编辑archive/xxx/ChangeLog.md，添加该包信息
- scp dh-.*.tar.gz & scp ChangeLog.md
- 通知运营和运维服务器代码已上传


[Sudo_Environment_variables]: https://wiki.archlinux.org/index.php/Sudo#Environment_variables
