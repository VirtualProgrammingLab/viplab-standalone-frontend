from flask import Flask
from flask import render_template, request, jsonify, url_for, redirect
from jwcrypto import jwk
import url64
import hashlib
import jwt
import json
import os
import sys
import glob

app = Flask(__name__, static_url_path='/static')

def prepare_computation(filename):
    jwks = json.load(open('jwks.private.json','r'))
    key = jwk.JWK(**jwks['keys'][0]).export_to_pem(True,None).decode('utf-8')
    with open(os.path.join('input', filename),'r',encoding='utf-8') as f:
        template = json.load(f)
    prefix = filename.split('.')[0]
    for computationfile in template['files']:
        for part in computationfile['parts']:
            if os.path.exists('input/%s.%s.txt'%(prefix,part['identifier'])):
                with open('input/%s.%s.txt'%(prefix,part['identifier']),'r',encoding='utf-8') as input_file:
                    part['content'] = url64.encode(input_file.read())
    data_base64=url64.encode(json.dumps(template))
    code_sha256 = hashlib.sha256(data_base64.encode('utf-8')).hexdigest()
    token = jwt.encode({'viplab.computation-template.digest': code_sha256, 'viplab.digest-replaceable':True, 'iss':'test'}, key, algorithm='RS512', headers={'kid': 'mykeyid'})

    return (data_base64, token, code_sha256)

@app.template_global()
def url_for_static_frontend(filetype, name):
    """ Look in static folder for full js/css filenames """
    fullname = ""
    files = glob.glob(os.path.join(app.static_folder, filetype, "vue",
                                   f"{name}.*.{filetype}"))
    if len(files) == 1:
        fullname = files[0]
    else:
        app.logger.warning('Did not find static frontend file')
    return url_for('static', filename=fullname[(len(app.static_folder)+1):])

def create_template_list():
    # get all templates
    template_list = sorted(glob.glob(os.path.join("input", "*.json")))
    template_name_list = sorted([os.path.basename(p) for p in template_list])
    return template_name_list

@app.before_first_request
def check_jwks_file():
    if not os.path.exists('jwks.private.json'):
        print('jwks.private.json not found')
        sys.exit(1)
    config = {"WEBSOCKET_API": os.environ.get("WSAPI", "ws://localhost/computations"),
              "IS_STUDENT": os.environ.get("IS_STUDENT", True)}
    with open(os.path.join(app.root_path, "static", "config.json"), 'w') as f:
        json.dump(config, f)

@app.route('/')
def main_page():
    return render_template('filelist.html', templates=create_template_list())

@app.route('/vue/<string:filename>')
def explore_computation_vue(filename):
    (data_base64, token, code_sha256) = prepare_computation(filename)
    return render_template('vue.html',
                           templates=create_template_list(),
                           digest=code_sha256, token=token,
                           data=data_base64,
                           wsapi=os.environ.get('WSAPI','ws://localhost:8080/computations'))

@app.route('/simple/<string:filename>')
def explore_computation_simple(filename):
    (data_base64, token, code_sha256) = prepare_computation(filename)
    return render_template('simple.html', templates=create_template_list(), digest=code_sha256, token=token, data=data_base64, wsapi=os.environ.get('WSAPI','ws://localhost:8080/computations'))

@app.route('/<string:filename>')
def redirect_static(filename):
    if os.path.isfile(os.path.join(app.root_path, 'static', 'js', 'ace', filename)):
        return redirect(url_for('static', filename='js/ace/%s'%filename))

@app.route('/sign', methods=['POST'])
def sign():
    """ Sign computation template with JWT and send token back to frontend """
    data_base64 = request.data
    code_sha256 = hashlib.sha256(data_base64).hexdigest()
    jwks = json.load(open('jwks.private.json','r'))
    key = jwk.JWK(**jwks['keys'][0]).export_to_pem(True,None).decode('utf-8')
    token = jwt.encode(
        {'viplab.computation-template.digest': code_sha256,
         'viplab.digest-replaceable': True, 'iss':'darus-connector'},
        key, algorithm='RS512', headers={'kid': 'mykeyid'})
    return jsonify({'token': token})

if __name__ == '__main__':
    if os.path.exists('jwks.private.json'):
        app.run(debug=True, host='0.0.0.0')
    else:
        print('jwks.private.json not found')
        sys.exit(1)
