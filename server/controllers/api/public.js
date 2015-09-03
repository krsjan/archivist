var Document = require('../../models/document.js')
  , Subjects = require('../../models/subject.js')
  , EntitiesGetter = require('./entities.js').get
  , EntitiesList = require('./entities.js').list
  , Location = require('../../models/location.js')
  , Interview = require('archivist-core/interview')
  , auth = require('../auth/utils.js')
  , APICache = require('../shared/cache.js')
  , interviews = require('../indexer/interviews')
  , _ = require('underscore')
  , async = require('async')
  , express = require('express')
  , api = express.Router();

/* Set CORS */

api.use(auth.allowCrossDomain);

/* The Public API */

var readDocument = function(req, res, next) {
  Document.getCleaned(req.params.id, true, function(err, document) {
    if (err) return next(err);
    prepareDocument(document, function(err, result) {
      if (err) return next(err);
      res.json(result);
    });
  });
}

var listDocuments = function(req, res, next) {
  if(!req.query.query) {
    req.query.query = {
      "nodes.document.published": true
    }
  } else {
    req.query.query["nodes.document.published"] = true;
  }
  Document.list(req.query, function(err, documents) {
    if (err) return next(err);
    res.json(documents);
  });
}

var getSubjectsList = function(cb) {
  Subjects.list({}, function(err, subjects) {
    if(err) return cb(err);
    cb(null, subjects);
  });
}

// Cache results for 5 minutes
var listSubjectsCache = new APICache(getSubjectsList, 5);

var listSubjects = function(req, res, next) {
  listSubjectsCache.get(function(err, subjects) {
    if(err) return next(err);
    res.json(subjects);
  });
}

var prepareDocument = function(doc, cb) {
  var interview = new Interview.fromJson(doc);
  async.parallel([
    function(callback){
      getSubjects(interview, callback);
    },
    function(callback){
      getEntities(interview, callback);
    }
  ],
  function(err, results){
    if (err) return cb(err);
    var output = {
      document: interview.toJSON(),
      subjects: results[0],
      entities: results[1]
    }
    cb(err, output);
  });

}

var getSubjects = function(doc, cb) {
  Subjects.list({}, function(err, subjects) {
    if (err) return cb(err);
    var subjectsModel = new Interview.SubjectsModel(doc, subjects);
    var filtered = subjectsModel.getAllReferencedSubjectsWithParents();
    cb(null, filtered);
  });
}

var getEntities = function(doc, cb) {
  var entityRefs = doc.getIndex('type').get('entity_reference');
  var entities = _.pluck(entityRefs, 'target');
  entities = _.uniq(entities);
  EntitiesGetter(entities, function (err, output) {
    if (err) return cb(err);
    cb(null, output);
  });
}

var getLocations = function(req, res, next) {
  interviews.countEntities(function(err, counters){
    var entities = _.keys(counters);
    var query = {
      _id: {
        '$in': entities
      }
    }
    Location.find(query, 'type name nearest_locality current_name country point _id', function (err, items) {
      if (err) return next(err);
      var geojson = {
        type: "FeatureCollection",
        features: []
      };
      _.each(items, function(item, key) {
        var feature = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": item.point
          },
          "properties": item.toJSON()
        }
        feature.properties.documents = counters[item._id].count;
        feature.properties.fragments = counters[item._id].occurrences;
        delete feature.properties.point;
        if(!_.isNull(item.point)) geojson.features.push(feature);
      })
      res.json(geojson);
    });
  });
}

var getSubjectsMap = function(cb) {
  Subjects.list({}, function(err, subjects) {
    if (err) return cb(err);
    var results = {}
    _.map(subjects, function(subject) {
      results[subject.id] = {
        name: subject.name,
        type: 'subject'
      }
    });
    cb(null, results);
  });
}

var getEntitiesMap = function(cb) {
  EntitiesList({}, function(err, entities) {
    if (err) return cb(err);
    var results = {}
    _.map(entities[1], function(entity) {
      results[entity.id] = {
        name: entity.name,
        type: 'entity',
        entity_type: entity.type
      }
    });
    cb(null, results);
  });
}

var getResourcesMap = function(cb) {
  async.parallel([
    function(callback){
      getSubjectsMap(callback);
    },
    function(callback){
      getEntitiesMap(callback);
    }
  ],
  function(err, results){
    if (err) return cb(err)
    var output = _.extend(results[0], results[1]);
    cb(null, output);
  });
}

// Cache results for 5 minutes
var resourceMapCache = new APICache(getResourcesMap, 5);

var getResources = function(req, res, next) {
  resourceMapCache.get(function(err, resourceMap) {
    if(err) return next(err);
    res.json(resourceMap);
  });
}

api.route('/public/locations')
  .get(getLocations)

api.route('/public/resources')
  .get(getResources);

api.route('/public/documents')
  .get(listDocuments);

api.route('/public/subjects')
  .get(listSubjects);

api.route('/public/documents/:id')
  .get(readDocument);

module.exports = api;