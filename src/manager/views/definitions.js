var Backbone = require('backbone'),
    Backgrid = require('backgrid'),
    Paginator = require('backbone.paginator'),
    Pageable = require('../local_modules/backgrid-paginator/backgrid-paginator.js'),
    forms = require('backbone-forms'),
    bootstrapForm = require('../local_modules/bootstrap-form/bootstrap3.js'),
    select2form = require('../local_modules/select2-form/select2.js'),
    HtmlEditor = require('../local_modules/htmleditor-form/editor.js'),
    modal = require('../node_modules/backbone.modal/backbone.modal.js'),
    models = require('../models/index.js'),
    $ = require('jquery'),
    _ = require('underscore'),
    Grid = require('./grid.js');

var DefinitionsGrid = Grid.main.extend({
  icon: 'definition',
  title: 'Definitions',
  className: 'definitionslist',
  initialize: function() {
    $('#' + this.icon).addClass('active');
    this.grid = new Backgrid.Grid({
      row: DefinitionRow,
      columns: this.options.columns,
      collection: this.options.collection
    });
    $(this.$el).append(this.grid.render().$el);
    this.paginator = new Backgrid.Extension.Paginator({
      columns: this.options.columns,
      collection: this.options.collection
    });
    $(this.$el).append(this.paginator.render().$el);
  },
  filters: function() {
    this.titleFilter = new Utils.filter({
      collection: this.options.collection,
      placeholder: "Enter a title to search",
      name: "synonyms",
    });
    $('.toolbox').prepend(this.titleFilter.render().el);
    this.typeFilter = new Utils.selectFilter({
      className: "definition-type backgrid-filter form-select",
      collection: this.options.collection,
      placeholder: "Select type",
      name: "definition_type"
    });
    $('.toolbox').append(this.typeFilter.render().el);
  },
  beforeClose: function() {
    this.titleFilter.remove();
    this.titleFilter.unbind();
    this.typeFilter.remove();
    this.typeFilter.unbind();
  },
  _add: function() {
    var dialogModel = new models.definition();
    var dialog = new editorDialog({model: dialogModel, collection: this.options.collection, new: true});
    $('#main').append(dialog.render().el);
  },
  _edit: function(model) {
    var dialog = new editorDialog({model: model, collection: this.options.collection, new: false});
    $('#main').append(dialog.render().el);
  },
  panel: [
    {
      name: "Add new definition",
      icon: "plus",
      fn: "_add"
    }
  ]
})
exports.definitionsGrid = DefinitionsGrid

var DefinitionCell = Backgrid.Cell.extend({
  className: "string-cell definition-cell grid-cell animate",
  initialize: function(options) {
    var that = this;
    Backgrid.Cell.prototype.initialize.call(this, options);
    this.model.on('change', function() {
      that.render();
    });
  },
  render: function () {
    this.$el.empty();
    var formattedValue = this.formatter.fromRaw(this.model);
    if(_.isNull(formattedValue) || _.isEmpty(formattedValue)){
      this.delegateEvents();
      return this;
    }
    else {

      var title = formattedValue.get('title'),
          synonyms = formattedValue.get('synonyms') || [],
          description = formattedValue.get('description'),
          type = _.isUndefined(formattedValue.get('definition_type')) ? 'unknown type' : formattedValue.get('definition_type'),
          updatedAt = _.isUndefined(formattedValue.get('updatedAt')) ? 'unknown' : new Date(formattedValue.get('updatedAt')).toDateString(),
          edited = _.isUndefined(formattedValue.get('edited')) || _.isNull(formattedValue.get('edited')) ? 'unknown' : formattedValue.get('edited').name,
          counter = formattedValue.get('docCounter'),
          typeClass = type;

      if (type == 'сокращение') {
        typeClass = 'abbr';
      } else if (type == 'лагерная реалия') {
        typeClass = 'reality';
      } else if (type == 'общий комментарий') {
        typeClass = 'jargon';
      }

      var markup = '<div class="meta-info"> \
                    <div class="definition-type ' + typeClass + '">' + type + '</div> \
                    <div class="counter">references: ' + counter + '</div> \
                    <div class="edited">' + edited + '</div> \
                    <div class="updated">updated at ' + updatedAt + '</div> \
                    </div> \
                    <div class="show-references"><i class="fa fa-book"></i></div> \
                    <div class="title">' + title + '</div> \
                    <div class="description">' + description + '</div> \
                    <div class="synonyms">' + (synonyms.length > 0 ? "Also know as: " + synonyms.join(", ") : "" ) + '</div>'

      this.$el.append(markup)
      this.delegateEvents()
      return this;
    }
  }
});
exports.definitionCell = DefinitionCell

var DefinitionRow = Backgrid.Row.extend({
  events: {
    "click": "onClick",
    "click .delete-document": "onRemove",
    "click .show-references": "onReference"
  },
  onClick: function (e) {
    e.preventDefault();
    Backbone.middle.trigger("goTo", '/definitions/' + this.model.get('id'));
  },
  onRemove: function(e) {
    e.preventDefault();
    e.stopPropagation();
    var confirm = window.confirm("Are you sure you want to do this?\nThis action can't be undone. Think twice!");
    if(confirm) {
      this.model.destroy();
    }
  },
  onReference: function(e) {
    e.preventDefault();
    e.stopPropagation();
    var self = this;
    var references = new models.documents();
    references.url = '/api/definitions/' + this.model.get('id') + '/references';
    references.state.pageSize = null;
    references.fetch().done(function() {
      var refModal = new entityModalReferences({model: self.model, collection: references});
      $('#main').append(refModal.render().el);
    })
  }
});

var editorDialog = Backbone.Modal.extend({
  prefix: 'editor-dialog',
  keyControl: false,
  template: _.template($('#editorDialog').html()),
  cancelEl: '.cancel',
  submitEl: '.save',
  onRender: function() {
    var that = this,
        model = this.model;
    this.form = new Backbone.Form({
      model: this.model
    }).render();
    this.$el.find('.delete').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var confirm = window.confirm("Are you sure you want to do this?\nThis action can't be undone. Think twice!");
      if(confirm) {
        that.delete();
      }
    });
    this.$el.find('.form').prepend(this.form.el);
    this.gridUrl = this.collection.url.split('/')[this.collection.url.split('/').length - 1];
  },
  serializeData: function () {
    return {remove: (this.model.id ? true : false)};
  },
  delete: function() {
    var self = this;
    this.$el.find('button').prop('disabled', true);
    this.$el.find('#meter').show();
    this.$el.find('#state').html('Deleting...');
    this.collection.remove(this.model);
    this.model.destroy({
      wait: true,
      success: function(model,resp) { 
        self.submit('Your definition has been removed.','Removed!');
      },
      error: function(model,err) { 
        self.submit('Something went wrong.','Error!');
      }
    });
  },
  beforeSubmit: function() {
    var self = this;
    var errors = self.form.commit();
    if(!errors) {

      // push name and nearest_locality or current_name to synonyms
      var synonyms = [];
      var oldSynonyms = this.model.get('synonyms') || [];
      var name = this.model.get('title');
      if(name != '') synonyms.push(name);
      var synonyms = _.union(synonyms, oldSynonyms);
      this.model.set('synonyms', synonyms);

      this.$el.find('button').prop('disabled', true);
      //this.$el.find('.save').text('Saving...');
      this.$el.find('#meter').show();
      this.$el.find('#state').html('Saving...');
      //check if old model
      if (this.model.id) {
        this.model.save({}, {
          wait: true,
          success: function(model,resp) { 
            self.submit('Your definition has been saved.','Saved!');
          },
          error: function(model,err) { 
            self.submit('Something went wrong.','Error!');
          }
        });
      } else {
        self.collection.create(self.model, {
          wait: true,
          success: function(model,resp) { 
            self.submit('Your new definition has been added to collection.','Saved!');
          },
          error: function(model,err) { 
            self.submit('Something went wrong.','Error!');
          }
        });
      }
    }
    //this.model.trigger('confirm', this);
    return false;
  },
  submit: function(msg, state) {
    var that = this;
    this.$el.find('#meter').addClass(state);
    this.$el.find('#state').addClass(state).html(msg);
    //this.model.stopListening();
    setTimeout(function(dialog){
      dialog.destroy();
      Backbone.middle.trigger("changeUrl", '/' + that.gridUrl);
    }, 1000, this);
  },
  cancel: function() {
    Backbone.middle.trigger("changeUrl", '/' + this.gridUrl);
    //this.model.stopListening();
  }
});

var entityModalReferences = Backbone.Modal.extend({
  prefix: 'subject-modal',
  keyControl: false,
  template: _.template($('#entityModalReferences').html()),
  cancelEl: '.cancel',
  submitEl: '.ok',
  submit: function() {
  }
});