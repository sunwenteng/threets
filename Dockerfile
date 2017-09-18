FROM	node:4
MAINTAINER Nigel0913 "nigel0913@gmail.com"

ENV     DH_CONFIG /data/config
ENV     DH_ROOT_PATH /data/work

ARG     name

RUN     npm install -g node-inspector@0.12.8

COPY	${name}.tar.gz /
RUN		npm install -g /${name}.tar.gz --production

VOLUME	["/data/work/", "/data/config/"]

EXPOSE  6103 8080

ENTRYPOINT ["dragon-hunter"]

CMD		[""]