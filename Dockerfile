FROM alpine:3.15 AS unpacker

ARG frontendversion

RUN mkdir /unpack
WORKDIR /unpack
RUN wget "https://github.com/VirtualProgrammingLab/viplab-vue-frontend/releases/download/$frontendversion/dist.zip" && \
    unzip dist.zip


FROM python:3.10-alpine

LABEL maintainer="pascal.seeland@tik.uni-stuttgart.de"

WORKDIR /

COPY requirements.txt ./

RUN apk add --no-cache --virtual .build-deps  \
		gcc \
		libffi-dev \
 		musl-dev \
		openssl-dev \
  &&  pip install --no-cache-dir -r requirements.txt \
  &&   apk del --no-network .build-deps 

COPY src app
COPY input input

COPY --from=unpacker /unpack/viplab-standalone-frontend-vue/dist/css/* app/static/css/vue/
COPY --from=unpacker /unpack/viplab-standalone-frontend-vue/dist/js/ app/static/js/vue/
COPY --from=unpacker /unpack/viplab-standalone-frontend-vue/dist/*.js app/static/js/ace/

EXPOSE 5000

ENV PYHTONPATH app
ENTRYPOINT [ "python" ]

CMD [ "app/app.py" ]
