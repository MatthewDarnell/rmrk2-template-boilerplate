

function updateConnectionStatus(status) {
    document.getElementById('connectionStatusSpan').innerText = `Socket Status: <${status}>`
}



let socket;
function initSocket () {
    let url = document.getElementById('wsServerInput').value || 'http://127.0.0.1:3000/'
    socket = io(url, {'forceNew':true });

    socket.on('disconnect', () => {
        updateConnectionStatus('Not Connected')
    })

    socket.on("connect", (s) => {
        updateConnectionStatus('Connected')

        socket.on('event', data => {
            writeToScreen(JSON.stringify(data))
        })
    });
    socket.on('api', data => {
        writeToScreen(data)
    })

}


initSocket()
function getSocket() { return socket }



function sendData(ev) {
    socket.emit(ev)
}
function subscribe(event) {
    socket.emit('subscribe', event)
}

