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
            downloadLink.src = Object.values(d.val().data).join('');
            downloadLink.name = d.val().name;
            downloadLink.controls = true;
            document.querySelector(`#${fileID}`).appendChild(downloadLink);
            document.querySelector(`#${fileID}-generator`).style.display = "none";
          });
          firebase.database().ref(`audio/${fileID}`).update({
            downloads: bodyscope.audioFiles[fileID].downloads+1
          })
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
        console.log(v.val?v.val():v);
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
  	firebase.auth().signInWithRedirect(provider);
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
      }
    }
  ]);
  function setupAudio(player, audioBase64, fileName){
    let dataset = audioBase64.separate(200000).multipart('data');
    player.src = audioBase64;
    console.log(dataset.data0.length)
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
  window.onload = function(){
    if(bodyscope != undefined){
      bodyscope.loggedIn = false;
    }
    setInterval(()=>{
      if(document.querySelector("#lgin")){
        document.querySelector("#lgin").removeEventListener('click', login);
        document.querySelector("#lgin").addEventListener('click', login);
      }else if(document.querySelector("#lgout")){
        document.querySelector("#lgout").removeEventListener('click', logout);
        document.querySelector("#lgout").addEventListener('click', logout);
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
        fileInput.removeEventListener('change', fileInputListener, false);
        fileInput.addEventListener('change', fileInputListener, false);
      }
      bodyscope.$apply();
    }, 1000);
  };
})({
  title: "History"
});
