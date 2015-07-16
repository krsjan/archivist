var Location = require('../models/location.js')
  , maintenance = require('./maintenance.js')
  , oauth = require('./oauth.js')
  , util = require('../util.js')
  , express = require('express')
  , api = express.Router();


/* The Location REST api */

var createLocation = function(req, res, next) {
  Location.add(req.body, req.user, function(err, location) {
    if (err) return next(err);
    res.json(location);
  });
}

var readLocation = function(req, res, next) {
  Location.get(req.params.id, function(err, location) {
    if (err) return next(err);
    res.json(location);
  });
}

var updateLocation = function(req, res, next) {
  Location.change(req.params.id, req.body, req.user, function(err, location) {
    if (err) return next(err);
    res.json(location);
  });
}

var deleteLocation = function(req, res, next) {
  Location.delete(req.params.id, function(err) {
    if (err) return next(err);
    res.json(200);
  });
}

var listLocations = function(req, res, next) {
  Location.list(req.query, function(err, locations) {
    if (err) return next(err);
    res.json(locations);
  });
}

var listPrisonLocations = function(req, res, next) {
  req.query.query = util.reduceQuery(req.query.query, {type: 'prison'});
  Location.list(req.query, function(err, locations) {
    if (err) return next(err);
    res.json(locations);
  });
}

var listToponymLocations = function(req, res, next) {
  req.query.query = util.reduceQuery(req.query.query, {type: 'toponym'});
  Location.list(req.query, function(err, locations) {
    if (err) return next(err);
    res.json(locations);
  });
}


api.route('/locations')
  .post(maintenance.checkCurrentMode, createLocation)
  .get(listLocations)

api.route('/locations/prisons')
  .get(listPrisonLocations)

api.route('/locations/toponyms')
  .get(listToponymLocations)

api.route('/locations/:id')
  .get(maintenance.checkCurrentMode, readLocation)
  .put(maintenance.checkCurrentMode, updateLocation)
  .delete(maintenance.checkCurrentMode, oauth.ensureSuperAuth, deleteLocation)

module.exports = api;