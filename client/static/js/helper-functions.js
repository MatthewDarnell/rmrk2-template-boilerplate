
function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}


function writeToScreen(data) {
    let jsonDiv = document.getElementById('eventsDiv')
    let el = document.createElement('pre')
    el.innerHTML = syntaxHighlight(JSON.parse(data))
    jsonDiv.insertBefore(el, jsonDiv.firstElementChild)
}

function httpGetAsync(theUrl, callback) {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function( data) {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
        else if(xmlHttp.readyState == 4 && xmlHttp.status == 500)
            alert(xmlHttp.responseText)
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send();
}

function httpRequest (route, getData) {
    let data = document.getElementById('httpApiInput').value
    let url = document.getElementById('httpServerInput').value || 'http://127.0.0.1:3000/'
    url += route + "/"
    if(getData && data) {
        url += data
    }
    httpGetAsync(url, data => {
        let el = document.createElement('pre')
        el.innerHTML = syntaxHighlight(JSON.parse(data))
        let httpDiv = document.getElementById('httpDiv')
        httpDiv.innerHTML = ""
        httpDiv.appendChild(el)
    })
}

function toggleDropdown(el) {
    document.getElementById(el).classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
