from flask import Flask
from flask import render_template
from jwcrypto import jwk
import url64
import hashlib
import jwt
import json
import os.path
import sys

app = Flask(__name__, static_url_path='/static')

@app.route('/')
def main_page():
    jwks = json.load(open('jwks.private.json','r'))
    key = jwk.JWK(**jwks['keys'][0]).export_to_pem(True,None).decode('utf-8')
    with open('input/container.computation-template.json','r',encoding='utf-8') as f:
        template = json.load(f)
    for computationfile in template['files']:
        for part in computationfile['parts']:
            if os.path.exists('input/container.partcontent.%s.txt'%part['identifier']):
                with open('input/container.partcontent.%s.txt'%part['identifier'],'r',encoding='utf-8') as input_file:
                    part['content'] = url64.encode(input_file.read())
    partid = template['files'][0]['parts'][0]['identifier']
    data_base64=url64.encode(json.dumps(template))
    code_sha256 = hashlib.sha256(data_base64.encode('utf-8')).hexdigest()
    
    token = jwt.encode({'viplab.computation-template.digest': code_sha256, 'iss':'test'}, key, algorithm='RS512', headers={'kid': 'mykeyid'}).decode()
    return render_template('main.html', digest = code_sha256, partid=partid, token=token, content=json.dumps(template), data=data_base64)

if __name__ == '__main__':
    if os.path.exists('jwks.private.json'):
        app.run(debug=True, host='0.0.0.0')
    else:
        print('jwks.private.json not found')
        sys.exit(1)
