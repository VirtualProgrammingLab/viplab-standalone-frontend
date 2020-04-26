let ws;
document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll('.partcontent').forEach(function(partcontent){
        partcontent.value = atob(JSON.parse(atob(document.querySelector('#dataholder').getAttribute('data-template')))['files'][0]['parts'][0]['content']);
    });
    let token = document.querySelector('#dataholder').getAttribute('data-token')
    ws = new WebSocket("ws://localhost:8083/computations")
    ws.onopen = () => {
        ws.send(JSON.stringify({"type":"authenticate","content":{"jwt":token}}));
    };
    document.getElementById("submit").onclick = senddata;
});

function senddata() { 
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
        console.log(partcontent);
        task['content']['task']['files'][0]['parts'].push({'identifier':partcontent.id, 'content':btoa(partcontent.value)});
    });
    ws.send(JSON.stringify(task));
    return false;
}
