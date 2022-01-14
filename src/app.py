from flask import Flask
from flask import render_template, redirect, url_for
from jwcrypto import jwk
import url64
import hashlib
import jwt
import json
import os
import sys
import glob

app = Flask(__name__, static_url_path='/static')

@app.route('/')
def main_page():
    # get all templates
    template_list = glob.glob(os.path.join("input", "*.json"))    
    return redirect(url_for("explore_computation", 
                            filename=os.path.basename(template_list[0])))

@app.route('/<string:filename>')
def explore_computation(filename):
    jwks = json.load(open('jwks.private.json','r'))
    key = jwk.JWK(**jwks['keys'][0]).export_to_pem(True,None).decode('utf-8')
    
    # get all templates
    template_list = glob.glob(os.path.join("input", "*.json"))
    template_name_list = [os.path.basename(p) for p in template_list]
    
    with open(os.path.join('input', filename),'r',encoding='utf-8') as f:
        template = json.load(f)
    for computationfile in template['files']:
        for part in computationfile['parts']:
            if os.path.exists('input/container.partcontent.%s.txt'%part['identifier']):
                with open('input/container.partcontent.%s.txt'%part['identifier'],'r',encoding='utf-8') as input_file:
                    part['content'] = url64.encode(input_file.read())
    data_base64=url64.encode(json.dumps(template))
    code_sha256 = hashlib.sha256(data_base64.encode('utf-8')).hexdigest()
    
    token = jwt.encode({'viplab.computation-template.digest': code_sha256, 'iss':'test'}, key, algorithm='RS512', headers={'kid': 'mykeyid'}).decode()
    wsapi = os.environ.get('WSAPI','ws://localhost:8080/computations')
    return render_template('main.html', templates=template_name_list, digest=code_sha256, token=token, data=data_base64, wsapi=wsapi)

if __name__ == '__main__':
    if os.path.exists('jwks.private.json'):
        app.run(debug=True, host='0.0.0.0')
    else:
        print('jwks.private.json not found')
        sys.exit(1)
