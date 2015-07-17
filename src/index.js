var Backbone = require('backbone'),
		_ = require('underscore'),
    jquery = require('jquery'),
    router = require('./router.js');

Backbone.$ = window.$ = jquery;

var AppStart = function() {
	initializeSession();
	verifyToken(function(err, data){
		if(err) {
			console.log('invalid session');
			return destroySession();
		}
		// renew token
		if (data.token) {
			console.log('renewing session...')
			localStorage.setItem('session', JSON.stringify(data));
			initializeSession();
		}
		var session = getSession();
		Backbone.AppRouter = new router();
  	Backbone.AppRouter.session = session;
   	Backbone.history.start({ pushState: true, root: '/' });
	})
}

var initializeSession = function() {
	var session = getSession();
	if (session) {
	  var token = session.token;
	  $.ajaxSetup({
	  	beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
		});
	} else {
		window.location.href = '/login';
	}
}

var getSession = function() {
	var session = localStorage.getItem('session');
	if(!session) return false;
	return JSON.parse(session);
}

var destroySession = function() {
	localStorage.removeItem('session');
	window.location.href = '/login';
}

var verifyToken = function(cb) {
	$.getJSON("/api/users/status", function(data) {
	  cb(null, data);
	})
	.error(function(err) { cb(err); })
};

Backbone.middle = _.extend({
	goTo: function(url) {
  	Backbone.AppRouter.navigate(url, {trigger: true});
	},
	goToPrev: function() {
		Backbone.AppRouter.previous();
	},
	goToExt: function(url) {
		window.location = url;
	},
	changeUrl: function(url) {
  	Backbone.AppRouter.navigate(url, {trigger: false});
	},
	changeTitle: function(title) {
		document.title = title;
	}
}, Backbone.Events);

Backbone.middle.on({
	"goTo": Backbone.middle.goTo,
	"goToPrevious": Backbone.middle.goToPrev,
	"goToExt": Backbone.middle.goToExt,
	"changeUrl": Backbone.middle.changeUrl,
	"domchange:title": Backbone.middle.changeTitle,
	"logout": destroySession
});

AppStart();