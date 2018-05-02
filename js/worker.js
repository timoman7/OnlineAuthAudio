importScripts('https://www.gstatic.com/firebasejs/4.12.1/firebase.js');
let config = {
    apiKey: "AIzaSyDha6Rn-nV8NFyY66Z4AIjXp2nA3exCEcQ",
    authDomain: "onlineaudioauth.firebaseapp.com",
    databaseURL: "https://onlineaudioauth.firebaseio.com",
    projectId: "onlineaudioauth",
    storageBucket: "onlineaudioauth.appspot.com",
    messagingSenderId: "999263265344"
};
firebase.initializeApp(config);
function b64toBlob(b64, sliceSize) {
    let b64Data = b64.replace(/data:([\w/\-]*);base64,/g,'');
    let contentType = b64.replace(/data:([\w/\-]*);base64,(.*)/g,'$1');
    sliceSize = sliceSize || 512;
    var byteCharacters = atob(b64Data);
    var byteArrays = [];
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);
        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}
onmessage = function(e){
    if(e.data.request == 'get'){
        firebase.database().ref(e.data.data).once('value', function(v){
            postMessage({
                data: v.val(),
                hash: e.data._hash_
            });
        });
    }else if(e.data.request == 'upload'){
        let _data;
        postMessage({
            data: _data,
            hash: e.data._hash_
        });
    }else if(e.data.request == 'download'){
        firebase.database().ref(`audio/${e.data.data}`).once('value', (d)=>{
            let concatSrc = "";
            let _audioFile_ = d.val();
            let kns = Object.keys(_audioFile_.data).sort(function(a,b){
                if(parseFloat(a.replace('data','')) > parseFloat(b.replace('data',''))){
                    return 1;
                }else if(parseFloat(a.replace('data','')) < parseFloat(b.replace('data',''))){
                    return -1;
                }else{
                    return 0;
                }
            });
            kns.forEach((kn)=>{
                concatSrc += _audioFile_.data[kn];
            });
            let _blob = URL.createObjectURL(b64toBlob(concatSrc));
            postMessage({
                data: {
                    name: _audioFile_.name,
                    blob: _blob
                },
                hash: e.data._hash_
            });
        });
    }
};