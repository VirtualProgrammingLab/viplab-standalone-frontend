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

EXPOSE 5000

ENV PYHTONPATH app
ENTRYPOINT [ "python" ]

CMD [ "app/app.py" ]
