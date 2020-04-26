FROM python:3.6-alpine

WORKDIR /

COPY requirements.txt ./

RUN apk add --no-cache --virtual .build-deps  \
		gcc \
		libffi-dev \
 		musl-dev \
#		ncurses-dev \
		openssl-dev \
  &&  pip install --no-cache-dir -r requirements.txt \
  &&   apk del --no-network .build-deps 

COPY src app
COPY input input

ENV PYHTONPATH app
ENTRYPOINT [ "python" ]

CMD [ "app/app.py" ]
