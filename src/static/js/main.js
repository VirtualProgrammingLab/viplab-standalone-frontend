let ws;
let files;

document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll('.partcontent').forEach(function(partcontent){
        partcontent.value = Base64.decode(JSON.parse(Base64.decode(document.querySelector('#dataholder').getAttribute('data-template')))['files'][0]['parts'][0]['content']);
    });
    let token = document.querySelector('#dataholder').getAttribute('data-token')
    ws = new WebSocket("ws://localhost:8083/computations")
    ws.onopen = () => {
        ws.send(JSON.stringify({"type":"authenticate","content":{"jwt":token}}));
        document.getElementById("submit").disabled = false;
    };
    ws.onmessage = function(event) {
        data = JSON.parse(event.data)
        switch  (data.type) {
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

function senddata() { 
    document.getElementById("submit").disabled = true;
    task = {
        "type":"create-computation",
        "content":{
            "template":document.querySelector('#dataholder').getAttribute('data-template'),
            "task":{
                "template":"cd39715e-55de-4563-bf8c-929d3d699953",
                "identifier":"11483f23-95bf-424a-98a5-ee5868c85c3e",
                "files": [
                    {   
                        "identifier":"9ce43170-c5e2-4eb2-87b9-013d3836527f",
                        "parts": []
                    }
                ]
            }
            
        }
    };
    document.querySelectorAll('.partcontent').forEach(function(partcontent){
        //console.log(partcontent);
        task['content']['task']['files'][0]['parts'].push({'identifier':partcontent.id, 'content':btoa(partcontent.value)});
    });
    document.querySelector('#stdout').value = '';
    ws.send(JSON.stringify(task));
    return false;
}

function displayComputation(computation) {
    //console.log(computation)
}

function displayResult(result) {
    console.log(result)
    document.querySelector('#stdout').value += Base64.decode(result.result.output.stdout);
    if ("final" == result.result.status) {
        document.getElementById("submit").disabled = false;
    }
    files = new Map();
    result.result.files.forEach(file => {
        var linode = document.createElement("li");
        var anode = document.createElement("a");
        anode.setAttribute('href', '#');
        anode.addEventListener("click",function() { return save(file.path,file.identifier,file.MIMEtype)});
        var textnode = document.createTextNode(file.path);
        anode.appendChild(textnode);
        linode.appendChild(anode);
        document.getElementById("fileList").appendChild(linode);
        files[file.identifier] = Base64.decode(file.content);
    });
}

function save(filename, identifier, mimetype) {
    var blob = new Blob([files[identifier]], {mimetype: mimetype});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
    return false;
}
