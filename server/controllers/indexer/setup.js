var async = require('async');
var configureEntitiesIndex = require('./entities/configure_index');
var seedEntitiesIndex = require('./entities/seed');
var configureInterviewsIndex = require('./interviews/configure_index');
var seedInterviewsIndex = require('./interviews/seed');

async.series([
  function(callback){
    configureEntitiesIndex(function(err) {
		  if (err) {
		    console.error(err);
		    throw err;
		  } else {
		    console.log('Entity index has been configured.');
		    callback(null);
		  }
		});
  },
  function(callback){
  	configureInterviewsIndex(function(err) {
		  if (err) {
		    console.error(err);
		    throw err;
		  } else {
		    console.log('Interviews index has been configured.');
		    seedEntitiesIndex({}, function(err) {
				  if (err) {
				    console.error(err);
				    throw err;
				  } else {
				    console.log('Done with entity indexing.');
				    callback(null);
				  }
				});
		  }
		});
  }
],
function(err, results){
	return;
});