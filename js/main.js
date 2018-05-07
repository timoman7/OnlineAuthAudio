function Hash(){
  let rv = '';
  for(let i = 0; i < 128; i++){
    if(Math.random()>0.5){
      rv += String.fromCharCode((65+Math.round(Math.random()*25))+(Math.round(Math.random())*32));
    }else{
      rv += ''+Math.round(Math.random()*9);
    }
  }
  return rv;
}
(async function(TConfig){
  /**
  * Debug section
  **/
  let currentUser = {
    uid: "-1",
    name: "Anonymous User",
    priv: "None"
  };
  /**
  *
  **/
  let bodyscope;
  let persistence;
  let myWorker;
  let workerPost;
  let dragState = "leave";
  if(window.Worker){
    myWorker = new Worker('./js/worker.js');
    workerPost = function(d){
      let hash = Hash();
      let isDone = false;
      let data;
      myWorker.addEventListener('message', function(e){
        if(e.data.hash == hash){
          data = e.data.data;
          isDone = true;
        }
      }, {
        once: true
      });
      myWorker.postMessage({
        request: d.request,
        data: d.data,
        _hash_: hash
      });
      return new Promise((resolve, reject)=>{
        function loop(){
          if(isDone){
            resolve(data);
          }else{
            setTimeout(loop, 1000);
          }
        }
        setTimeout(loop, 1000);
      });
    };
  }
  let mySW;
  if(navigator.serviceWorker){
    navigator.serviceWorker.register('./js/serviceWorker.js').then(function(registration) {
      console.log('Service worker registration succeeded:', registration);
      mySW = registration;
      window.mySW = mySW;
    }).catch(function(error) {
      console.log('Service worker registration failed:', error);
    });
  }
  function b64toBlob(b64, sliceSize) {
    let b64Data = b64.replace(/data:([\w/\-]*);base64,/g,'');
    let contentType = b64.replace(/data:([\w/\-]*);base64,(.*)/g,'$1');
    sliceSize = sliceSize || 512;

    var byteCharacters = window.atob(b64Data);
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
  firebase.auth().getRedirectResult().then((result)=>{
    firebase.auth().onAuthStateChanged(user =>{
      let credential = result.credential;
      if(user != null){
        if(bodyscope != undefined){
          bodyscope.loggedIn = true;
          bodyscope.addUser = function(uid){
            firebase.database().ref(`users/${uid}`).update({
              priv: 'User'
            });
          };
          bodyscope.remUser = function(uid){
            firebase.database().ref(`users/${uid}`).update({
              priv: 'None'
            });
          };
          bodyscope.adminUser = function(uid){
            if(prompt(`Set ${bodyscope.users[uid].name} to admin?\nType "Yes, set to admin" to continue.`) == "Yes, set to admin"){
              firebase.database().ref(`users/${uid}`).update({
                priv: 'Admin'
              });
              alert(`Set ${bodyscope.users[uid].name} as admin.`);
            }else{
              alert('Aborted privilege elevation.');
            }
          };
          bodyscope.transferOwnership = function(uid){
            if(prompt(`Transfer ownership to ${bodyscope.users[uid].name}?\nType "Yes, transfer ownership" to continue.`) == "Yes, transfer ownership"){
              firebase.database().ref('admin').update({
                uid: uid,
                name: bodyscope.users[uid].name
              });
              alert(`Set owner to ${bodyscope.users[uid].name}.`);
            }else{
              alert('Aborted transfer.');
            }
          };
          bodyscope.downloadFile = function(fileID){
            if(window.Worker){
              workerPost({request: 'download', data: fileID})
                .then((data)=>{
                  let downloadPreview = document.createElement('audio');
                  let downloadLink = document.createElement('a');
                  downloadPreview.src = data.blob;
                  downloadPreview.controls = true;
                  downloadPreview.controlsList = 'nodownload';
                  downloadLink.href = data.blob;
                  downloadLink.innerHTML = "";
                  downloadLink.classList.add('glyphicon', 'glyphicon-download')
                  downloadLink.download = data.name;
                  document.querySelector(`#${fileID}`).appendChild(downloadPreview);
                  document.querySelector(`#${fileID}`).appendChild(downloadLink);
                  document.querySelector(`#${fileID}-generator`).style.display = "none";
                });
              firebase.database().ref(`audio/${fileID}`).update({
                downloads: bodyscope.audioFiles[fileID].downloads+1
              });
            }else{
              firebase.database().ref(`audio/${fileID}`).once('value', (d)=>{
                let downloadPreview = document.createElement('audio');
                let downloadLink = document.createElement('a');
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
                downloadPreview.src = URL.createObjectURL(b64toBlob(concatSrc));
                downloadPreview.controls = true;
                downloadPreview.controlsList = 'nodownload';
                downloadLink.href = URL.createObjectURL(b64toBlob(concatSrc));
                downloadLink.innerHTML = "";
                downloadLink.classList.add('glyphicon', 'glyphicon-download')
                downloadLink.download = _audioFile_.name;
                document.querySelector(`#${fileID}`).appendChild(downloadPreview);
                document.querySelector(`#${fileID}`).appendChild(downloadLink);
                document.querySelector(`#${fileID}-generator`).style.display = "none";
              });
              firebase.database().ref(`audio/${fileID}`).update({
                downloads: bodyscope.audioFiles[fileID].downloads+1
              });
            }
          };
          bodyscope.deleteAudio = function(fileID){
            firebase.database().ref(`audio/${fileID}`).remove();
          };
          firebase.database().ref('users').on('value', (u)=>{
            bodyscope.users = u.val();
          });
          firebase.database().ref('admin').on('value', (u)=>{
            bodyscope.owner = u.val();
          });
          firebase.database().ref('audio').on('value', (u)=>{
            bodyscope.audioFiles = u.val();
          });
        }
        currentUser = firebase.auth().currentUser;
        let userReference = firebase.database().ref(`users/${currentUser.uid}`);
        userReference.on('value', (v) => {
          let data = v.val();
          for(let kn in data){
            currentUser[kn] = data[kn];
          }
          currentUser.name = currentUser.displayName;
          if(bodyscope != undefined){
            bodyscope.currentUser = currentUser;
          }
        });
        userReference.update({
          name: currentUser.displayName,
          uid: currentUser.uid,
          online: true
        });
        userReference.onDisconnect().update({
          online: false
        });
      }else{
        currentUser = {
          uid: "-1",
          name: "Anonymous User",
          priv: "None"
        };
      }
    });
  },(error)=>{
    let email = error.email;
    let credential = error.credential;
  });
  function login(){
    var provider;
    provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().setPersistence(persistence).then(function(){
      return firebase.auth().signInWithRedirect(provider);
    });
  }
  function logout(){
    firebase.database().ref(`users/${currentUser.uid}`).update({
      online: false
    });
    firebase.auth().signOut().then(()=>{
      location.reload();
    }).catch((error)=>{
      // An error happened.
      console.log(error);
      alert("Somehow you screwed up logging out.");
    });
  }
  Array.prototype.multipart = function(name) {
    let rv = {};
    for (let i = 0; i < this.length; i++) {
      rv[`${name}${i}`] = this[i];
    }
    return rv;
  };
  String.prototype.separate = function(amt) {
    return this.match(new RegExp(`.{1,${amt}}`, 'g'));
  };
  var app = angular.module('page', []);
  app.controller("body", [
    '$scope',
    function($scope){
      bodyscope = $scope;
      $scope.loggedIn = false;
      $scope.website_title = TConfig.title;
      $scope.currentUser = currentUser;
      $scope.view = 'previewFiles';
      $scope.setView = function(_view){
        $scope.view = _view;
      };
      $scope.removeUpload = function(uploadData){
        if($scope.AllFiles){
          if($scope.AllFiles.indexOf(uploadData) != -1){
            $scope.AllFiles = $scope.AllFiles.filter((a)=>{
              return a != uploadData;
            });
            setupAudio();
          }
        }
      };
      $scope.rememberMe = window.localStorage.getItem('persistence')=='local'?true:false;
      $scope.fbSetPersistence = function(state){
        switch(state){
          case true:
            persistence = firebase.auth.Auth.Persistence.LOCAL;
            break;
          case false:
            persistence = firebase.auth.Auth.Persistence.SESSION;
            break;
        }
        window.localStorage.setItem('persistence', persistence);
      }
    }
  ]);
  function setupAudio(){
    if(bodyscope != undefined){
      let audioSets = bodyscope.AllFiles;
      bodyscope.addAudio = function(){
        audioSets.forEach((audioSet)=>{
          let audioBase64 = audioSet.audioBase64,
              fileName = audioSet.fileName;
          let dataset = audioBase64.separate(200000).multipart('data');
          let newKey = firebase.database().ref('audio').push().key;
          let newAudio = {};
          newAudio[newKey] = {
            name: fileName,
            downloads: 0,
            index: newKey
          };
          firebase.database().ref('audio').update(newAudio);
          for(let dv in dataset){
            let d = {};
            d[dv] = dataset[dv];
            firebase.database().ref(`audio/${newKey}/data`).update(d);
          }
        });
        alert(`Uploaded ${audioSets.length} file${audioSets.length!=1?'s':''}`);
      };
    }
  }
  // function addEvent(str, fn){
  //   let dom = document.querySelector()
  // }
  window.onload = function(){
    if(window.localStorage.getItem('persistence')){
      persistence = window.localStorage.getItem('persistence');
    }else{
      window.localStorage.setItem('persistence', 'session');
    }
    persistence = window.localStorage.getItem('persistence');
    if(bodyscope != undefined){
      bodyscope.loggedIn = false;
    }
    setInterval(()=>{
      if(document.querySelector("#lgin")){
        document.querySelector("#lgin").onclick = login;
        // document.querySelector("#lgin").removeEventListener('click', login);
        // document.querySelector("#lgin").addEventListener('click', login);
      }else if(document.querySelector("#lgout")){
        document.querySelector("#lgout").onclick = logout;
        // document.querySelector("#lgout").removeEventListener('click', logout);
        // document.querySelector("#lgout").addEventListener('click', logout);
      }
      if(document.querySelector('#screenInput')){
        let fileInput = document.querySelector('#screenInput');
        window.ondragenter = function(e){
          if(e.dataTransfer){
            if(e.dataTransfer.items.length > 0){
              let onlyAudio = true;
              for(let i = 0; i < e.dataTransfer.items.length; i++){
                if(!e.dataTransfer.items[0].type.match('audio/')){
                  onlyAudio = false;
                }
              }
              if(onlyAudio){
                fileInput.classList.add('isDragging');
              }
            }
          }
        };
        window.ondragleave = function(e){
          if(e.clientX == 0 && e.clientY == 0){
            fileInput.classList.remove('isDragging');
          }
        };
        // fileInput.style.width = `${window.innerWidth}px`;
        // fileInput.style.height = `${window.innerHeight}px`;
        function fileInputListener(e) {
          if(bodyscope != undefined){
            bodyscope.allLoaded = false;
            bodyscope.AllFiles = [];
            for(let f = 0; f < fileInput.files.length; f++){
              let reader = new FileReader();
              reader.onload = function(e) {
                if(!bodyscope.allLoaded){
                  bodyscope.AllFiles.push({
                    audioBase64: this.result,
                    fileName: fileInput.files[f].name
                  });
                }
                if(bodyscope.AllFiles.length == fileInput.files.length){
                  bodyscope.allLoaded = true;
                  setupAudio();
                }
              };
              reader.readAsDataURL(fileInput.files[f]);
            }
          }
        }
        fileInput.ondrop = function(e){
          new Promise(function(resolve, reject){
            function checkFileLength(e){
              if(fileInput.files.length > 0){
                resolve(e);
              }else{
                setTimeout(checkFileLength,500, e);
              }
            }
            setTimeout(checkFileLength,500, e);
          }).then((e)=>{
            fileInputListener(e);
          });
          fileInput.classList.remove('isDragging');
        };
        fileInput.onchange = function(e){
          if(!fileInput.classList.contains('isDragging')){
            new Promise(function(resolve, reject){
              function checkFileLength(e){
                if(fileInput.files.length > 0){
                  resolve(e);
                }else{
                  setTimeout(checkFileLength,500, e);
                }
              }
              setTimeout(checkFileLength,500, e);
            }).then((e)=>{
              fileInputListener(e);
            });
          }
        };
        // fileInput.removeEventListener('change', fileInputListener, false);
        // fileInput.addEventListener('change', fileInputListener, false);
      }
      bodyscope.$apply();
    }, 1000);
  };
})({
  title: "History"
});
