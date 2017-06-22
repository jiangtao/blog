每个项目使用自己的docker，dockerfile，互不冲突，进程独立。如果您觉得下面太啰嗦的话，可以直接[查看源码](https://github.com/Jerret321/docker-node-shell)运行~。 但建议看下过程，对您或许有些帮助。 <!--more-->

##  创建属于自己的docker镜像

根据自己的爱好，搭建一个base环境，以博主为例，搭建centos，node，npm基础环境镜像。避免"墙"的影响，使用[阿里云docker镜像](https://cr.console.aliyun.com)托管。具体的过程可以参考[这篇文章](https://github.com/widuu/chinese_docker/blob/master/userguide/dockerimages.md)

注：由于使用的是国内的阿里云镜像，修改保存镜像后上传到阿里云镜像。[点击可查看生成新镜像和操作阿里云](https://cr.console.aliyun.com/#/dockerImage/19398/detail)

## 配置dockerfile 安装必要依赖
```bash
# 拉取一个源
FROM registry.cn-hangzhou.aliyuncs.com/jerret/node-dev:v0.1.1
# 作者信息
MAINTAINER 321jiangtao@gmail.com
# 安装依赖包
RUN npm install -g pm2 webpack
# 设置docker container执行之后的工作目录
WORKDIR /var/www/blog
# 对外暴露的端口
EXPOSE 8360
```

## 运行程序
配置完Dockerfile后，编译成一个images
```bash
docker build -t jt/blog .
```
此时使用`docker images` 可查看到
```bash
REPOSITORY     TAG                 IMAGE ID            CREATED             SIZE
jt/blog                 latest              aca0b53b6bdf      21 hours ago        1.66 GB
```
## 运行生成的images
```bash
# -v 宿主机和docker container之间的目录映射 理解为软连接即可
# -p 宿主机和docker之间的端口映射
# -t container 别名
# -d 挂载docker container
docker run -p 8360:8360 -v $PWD/blog:/var/www/blog -idt jt/blog
```
## 进入挂载的docker container

此时挂载的docker container相当于一台已经配好环境的虚拟机, `docker ps `查看到
```bash
CONTAINER ID   IMAGE     COMMAND      CREATED          STATUS         PORTS                                 NAMES
8629f0b244fc     jt/blog      "/bin/bash"       15 hours ago     Up 15 hours  0.0.0.0:8360->8360/tcp       thirsty_yalow
```
执行 `docker attach 8629f0b244fc`  可进入到 `container`中

## 退出container 
`ctrl + P + Q` 退出 container 回到 主机

以上是博主刚使用的docker的一些记录，如有错误欢迎指出。

