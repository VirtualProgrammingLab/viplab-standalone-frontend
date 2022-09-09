FROM alpine:3.15 AS unpacker

ARG frontendversion

RUN mkdir /unpack
WORKDIR /unpack
RUN wget "https://github.com/VirtualProgrammingLab/viplab-vue-frontend/releases/download/$frontendversion/$frontendversion-dist.zip" && \
    unzip $frontendversion-dist.zip


FROM python:3.6-alpine

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

COPY --from=unpacker /unpack/css/* app/css/vue/
COPY --from=unpacker /unpack/js/* app/css/js/

EXPOSE 5000

ENV PYHTONPATH app
ENTRYPOINT [ "python" ]

CMD [ "app/app.py" ]
