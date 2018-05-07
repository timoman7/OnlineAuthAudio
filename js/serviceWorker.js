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
let messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  var notificationTitle = 'Permission updated';
  var notificationOptions = {
    body: 'Background Message body.',
    icon: '/firebase-logo.png'
  };
  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});
let authChanged = false;
firebase.auth().onAuthStateChanged(function(a){
  if(!authChanged){
    if(firebase.auth().currentUser != null){
      firebase.database().ref(`users/${firebase.auth().currentUser.uid}/priv`).on('value',function(v){
        self.registration.showNotification('User permissions changed', {
            body: `Permission set to ${v.val()}`
          });
      });
      authChanged = true;
    }
  }
});