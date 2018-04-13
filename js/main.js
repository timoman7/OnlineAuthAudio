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
  	let user = result.user;
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
        bodyscope.downloadFile = function(fileID){
          firebase.database().ref(`audio/${fileID}`).once('value', (d)=>{
            let downloadLink = document.createElement('audio');
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
            downloadLink.src = URL.createObjectURL(b64toBlob(concatSrc));
            downloadLink.download = _audioFile_.name;
            downloadLink.controls = true;
            document.querySelector(`#${fileID}`).appendChild(downloadLink);
            document.querySelector(`#${fileID}-generator`).style.display = "none";
          });
          firebase.database().ref(`audio/${fileID}`).update({
            downloads: bodyscope.audioFiles[fileID].downloads+1
          })
        };
        bodyscope.deleteAudio = function(fileID){
          firebase.database().ref(`audio/${fileID}`).remove();
        };
        firebase.database().ref('users').on('value', (u)=>{
          bodyscope.users = u.val();
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
  },(error)=>{
  	let email = error.email;
  	let credential = error.credential;
  });
  function login(){
  	var provider;
  	provider = new firebase.auth.GoogleAuthProvider();
    console.log(persistence)
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
      $scope.rememberMe = window.localStorage.getItem('persistence')=='local'?true:false;
      $scope.fbSetPersistence = function(state){
        switch(state){
          case true:
            persistence = firebase.auth.Auth.Persistence.LOCAL;
            break;
          case false:
            persistence = firebase.auth.Auth.Persistence.NONE;
            break;
        }
        window.localStorage.setItem('persistence', persistence);
      }
    }
  ]);
  function setupAudio(player, audioBase64, fileName){
    let dataset = audioBase64.separate(200000).multipart('data');
    player.src = audioBase64;
    if(bodyscope != undefined){
      bodyscope.addAudio = function(){
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
      };
    }
  }
  // function addEvent(str, fn){
  //   let dom = document.querySelector()
  // }
  window.onload = function(){
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
      if(document.querySelector('input[type="file"]')){
        let fileInput = document.querySelector('input[type="file"]');
        let _audioPreview_ = document.querySelector('#audioPreview');
        function fileInputListener(e) {
          var reader = new FileReader();
          reader.onload = function(e) {
            setupAudio(_audioPreview_, this.result, fileInput.files[0].name);
          };
          reader.readAsDataURL(this.files[0]);
        }
        fileInput.onchange = fileInputListener;
        // fileInput.removeEventListener('change', fileInputListener, false);
        // fileInput.addEventListener('change', fileInputListener, false);
      }
      bodyscope.$apply();
    }, 1000);
  };
})({
  title: "History"
});
