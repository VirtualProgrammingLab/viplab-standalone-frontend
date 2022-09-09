let ws;
let files;
let template;

document.addEventListener("DOMContentLoaded", function() {
    template = JSON.parse(Base64.decode(document.querySelector(
        '#inputfiles').getAttribute('data-template')));
    console.log(template);
    template.files.forEach(inputfile => buildInputFile(inputfile));
    let token = document.querySelector('#inputfiles').getAttribute('data-token');
    let wsapi = document.querySelector('body').getAttribute("data-wsapi");
    ws = new WebSocket(wsapi);
    ws.onopen = () => {
        ws.send(JSON.stringify({ "type": "authenticate", "content": { "jwt": token } }));
        document.getElementById("submit").disabled = false;
    };
    ws.onmessage = function(event) {
        data = JSON.parse(event.data)
        switch (data.type) {
            case "computation":
                displayComputation(data.content);
                break;
            case "result":
                displayResult(data.content);
                break;
            default:
                console.error(data);
        }
    }
    document.getElementById("submit").onclick = senddata;
});

function buildInputFile(inputfile) {
    let filediv = document.createElement("div");
    filediv.setAttribute('class', 'file');
    let filenametag = document.createElement("div");
    filenametag.innerHTML = inputfile.path;
    filediv.appendChild(filenametag);
    filediv.setAttribute('id', inputfile.identifier);
    inputfile['parts'].forEach(part => {
        if ('invisible' != part.access) {
            let htmlElements = []

            let partid = document.createElement("div");
            partid.innerHTML = part.identifier;
            htmlElements.push(partid)

            let textArea = document.createElement("textarea");
            textArea.setAttribute('rows', 20);
            textArea.setAttribute('cols', 120);

            if ('visible' == part.access) {
                textArea.setAttribute('disabled', true)
                textArea.value = Base64.decode(part['content']);
                htmlElements.push(textArea)
            } else {
                textArea.setAttribute('class', 'partcontent');
                textArea.setAttribute('id', part.identifier);
                if (part.access == 'modifiable') {
                    textArea.value = Base64.decode(part['content']);
                    htmlElements.push(textArea)
                } else {
                    let templateArea = document.createElement("textarea");
                    templateArea.setAttribute('rows', 20);
                    templateArea.setAttribute('cols', 120);
                    templateArea.setAttribute('disabled', true)
                    templateArea.value = Base64.decode(part['content']);
                    htmlElements.push(templateArea);
                    parameters = {}
                    textArea.setAttribute("rows", Object.keys(part.parameters).length + 2);
                    Object.keys(part.parameters).forEach(parameter => {
                        parameters[part.parameters[parameter].identifier] = "";
                    });

                    textArea.value = JSON.stringify(parameters, null, 2);
                    htmlElements.push(textArea);
                }
            }
            htmlElements.forEach(element => {
                filediv.appendChild(element);
            });
        }
    });
    document.querySelector('#inputfiles').appendChild(filediv);
}

function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function senddata() {
    document.getElementById("submit").disabled = true;
    task = {
        "type": "create-computation",
        "content": {
            "template": document.querySelector('#inputfiles').getAttribute('data-template'),
            "task": {
                "template": template.identifier,
                "identifier": uuid(),
                "files": []
            }

        }
    };
    document.querySelectorAll('.file').forEach(function(filediv) {
        let file = { 'identifier': filediv.id, 'parts': [] };
        filediv.querySelectorAll('.partcontent').forEach(function(partcontent) {
            //console.log(partcontent);
            file.parts.push({ 'identifier': partcontent.id, 'content': Base64.encode(partcontent.value) });
        });
        task.content.task.files.push(file)
    });
    document.querySelector('#stdout').value = '';
    document.querySelector('#stderr').value = '';
    document.getElementById("fileList").innerHTML = '';
    files = new Map();
    ws.send(JSON.stringify(task));
    return false;
}

function displayComputation(computation) {
    //console.log(computation)
}

function displayResult(result) {
    console.log(result)
    document.querySelector('#stdout').value += Base64.decode(result.result.output.stdout);
    document.querySelector('#stderr').value += Base64.decode(result.result.output.stderr);

    if ("final" == result.result.status) {
        document.getElementById("submit").disabled = false;
    }
    artifacts = new Map();
    result.result.artifacts.forEach(file => {
        var linode = document.createElement("li");
        var anode = document.createElement("a");
        if(file.type == "file") {
            anode.setAttribute('href', '#');
            anode.addEventListener("click", function() { return save(file.path, file.identifier, file.MIMEtype) });
            var textnode = document.createTextNode(file.path);
            anode.appendChild(textnode);
            linode.appendChild(anode);
            document.getElementById("fileList").appendChild(linode);
            files[file.identifier] = Base64.decode(file.content);
        }
        if(file.type == "s3file") {
            anode.setAttribute('href', file.url);
            anode.addEventListener("click", function() { return save(file.path, file.identifier, file.MIMEtype) });
            var textnode = document.createTextNode(file.path);
            anode.appendChild(textnode);
            linode.appendChild(anode);
            document.getElementById("fileList").appendChild(linode);
            files[file.identifier] = Base64.decode(file.content);
        }
    });
}

function save(filename, identifier, mimetype) {
    var blob = new Blob([files[identifier]], { mimetype: mimetype });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
    return false;
}
