var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var testSerializer = DS.Serializer.create({
  primaryKey: function() { return 'id'; }
});

var TestAdapter = DS.Adapter.extend({
  serializer: testSerializer
});

module("DS.Store", {
  teardown: function() {
    set(DS, 'defaultStore', null);
  }
});

test("a store can be created", function() {
  var store = DS.Store.create();
  ok(store, 'a store exists');
});

test("the first store becomes the default store", function() {
  var store = DS.Store.create();
  equal(get(DS, 'defaultStore'), store, "the first store is the default");
});

test("a specific store can be supplied as the default store", function() {
  DS.Store.create();
  var store = DS.Store.create({ isDefaultStore: true });
  DS.Store.create();

  equal(get(DS, 'defaultStore'), store, "isDefaultStore overrides the default behavior");
});

test("when a store is destroyed, it removes itself as the default store", function() {
  var store = DS.Store.create({ isDefaultStore: true });

  equal(get(DS, 'defaultStore'), store, "precond - store creates itself as default store");
  store.destroy();

  equal(get(DS, 'defaultStore'), null, "default store is set to null after previous default was destroyed");
});

var stateManager, stateName;

module("DS.StateManager", {
  setup: function() {
    stateManager = DS.StateManager.create();
  }
});

var isTrue = function(flag) {
  var state = stateName.split('.').join('.states.');
  equal(getPath(stateManager, 'states.rootState.states.'+ state + "." + flag), true, stateName + "." + flag + " should be true");
};

var isFalse = function(flag) {
  var state = stateName.split('.').join('.states.');
  equal(getPath(stateManager, 'states.rootState.states.'+ state + "." + flag), false, stateName + "." + flag + " should be false");
};

test("the empty state", function() {
  stateName = "empty";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loading state", function() {
  stateName = "loading";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loaded state", function() {
  stateName = "loaded";
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the updated state", function() {
  stateName = "loaded.updated";
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the saving state", function() {
  stateName = "loaded.updated.inFlight";
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the deleted state", function() {
  stateName = "deleted";
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saving state", function() {
  stateName = "deleted.inFlight";
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saved state", function() {
  stateName = "deleted.saved";
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});


test("the error state", function() {
  stateName = "error";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isTrue("isError");
});

module("DS.Store working with a DS.Adapter");

test("Calling Store#find invokes its adapter#find", function() {
  expect(4);

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      ok(true, "Adapter#find was called");
      equal(store, currentStore, "Adapter#find was called with the right store");
      equal(type,  currentType,  "Adapter#find was called with the type passed into Store#find");
      equal(id,    1,            "Adapter#find was called with the id passed into Store#find");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.find(currentType, 1);
});

test("DS.Store has a load method to load in a new record", function() {
  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(type, id, { id: 1, name: "Scumbag Dale" });
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var object = currentStore.find(currentType, 1);

  equal(adapter.toJSON(object).name, "Scumbag Dale", "the data hash was inserted");
});

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

test("DS.Store has a load method to load in an Array of records", function() {
  var adapter = TestAdapter.create({

    findMany: function(store, type, ids) {
      store.loadMany(type, ids, array);
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var objects = currentStore.findMany(currentType, [1,2,3]);

  for (var i=0, l=get(objects, 'length'); i<l; i++) {
    var object = objects.objectAt(i), hash = array[i];

    deepEqual(adapter.toJSON(object, { includeId: true }), hash);
  }
});

test("DS.Store loads individual records without explicit IDs", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});

test("can load data for the same record if it is not dirty", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  equal(get(tom, 'isDirty'), false, "precond - record is not dirty");
  equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

  store.load(Person, { id: 1, name: "Captain Underpants" });
  equal(get(tom, 'name'), "Captain Underpants", "updated record with new date");
});

/*
test("DS.Store loads individual records without explicit IDs with a custom primaryKey", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({ name: DS.attr('string'), primaryKey: 'key' });

  store.load(Person, { key: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});
*/

test("DS.Store passes only needed guids to findMany", function() {
  expect(8);

  var adapter = TestAdapter.create({
    findMany: function(store, type, ids) {
      deepEqual(ids, [4,5,6], "only needed ids are passed");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.loadMany(currentType, [1,2,3], array);

  var objects = currentStore.findMany(currentType, [1,2,3,4,5,6]);

  equal(get(objects, 'length'), 6, "the RecordArray returned from findMany has all the objects");

  var i, object, hash;
  for (i=0; i<3; i++) {
    object = objects.objectAt(i);
    hash = array[i];

    deepEqual(adapter.toJSON(object, { includeId: true }), hash);
  }

  for (i=3; i<6; i++) {
    object = objects.objectAt(i);
    ok(currentType.detectInstance(object), "objects are instances of the RecordArray's type");
  }
});

test("loadMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend({ name: DS.attr('string') });

  store.loadMany(Person, array);
  equal(get(store.find(Person, 1), 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
});

/*
test("loadMany uses a model's primaryKey if one is provided to extract ids", function() {
  var store = DS.Store.create();

  var array = [{ key: 1, name: "Scumbag Dale" }, { key: 2, name: "Scumbag Katz" }, { key: 3, name: "Scumbag Bryn" }];

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    primaryKey: "key"
  });

  store.loadMany(Person, array);
  equal(get(store.find(Person, 1), 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
});
*/

test("loadMany takes an optional Object and passes it on to the Adapter", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.create({
    findQuery: function(store, type, query) {
      equal(type, Person, "The type was Person");
      equal(query, passedQuery, "The query was passed in");
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  store.find(Person, passedQuery);
});

test("findAll(type) returns a record array of all records of a specific type", function() {
  var store = DS.Store.create({ adapter: DS.Adapter.create() });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, 1, { id: 1, name: "Tom Dale" });

  var results = store.findAll(Person);
  equal(get(results, 'length'), 1, "record array should have the original object");
  equal(get(results.objectAt(0), 'name'), "Tom Dale", "record has the correct information");

  store.load(Person, 2, { id: 2, name: "Yehuda Katz" });
  equal(get(results, 'length'), 2, "record array should have the new object");
  equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "record has the correct information");

  strictEqual(results, store.findAll(Person), "subsequent calls to findAll return the same recordArray)");
});

test("a new record of a particular type is created via store.createRecord(type)", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person);

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  set(person, 'name', "Braaahm Dale");

  equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

test("an initial data hash can be provided via store.createRecord(type, hash)", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { name: "Brohuda Katz" });

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { id: 1, name: "Brohuda Katz" });

  var again = store.find(Person, 1);

  strictEqual(person, again, "the store returns the loaded object");
});

test("records inside a collection view should have their ids updated", function() {
  var Person = DS.Model.extend();

  var idCounter = 1;
  var adapter = TestAdapter.create({
    createRecord: function(store, type, record) {
      store.didCreateRecord(record, {name: record.get('name'), id: idCounter++});
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var container = Ember.CollectionView.create({
    content: store.find(Person)
  });

  container.appendTo('#qunit-fixture');

  store.createRecord(Person, {name: 'Tom Dale'});
  store.createRecord(Person, {name: 'Yehuda Katz'});

  store.commit();

  container.content.forEach(function(person, index) {
    equal(person.get('id'), index + 1, "The record's id should be correct.");
  });
});

module("DS.State - Lifecycle Callbacks");

test("a record receives a didLoad callback when it has finished loading", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didLoad: function() {
      callCount++;
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });
  store.find(Person, 1);

  equal(callCount, 1, "didLoad callback was called once");
});

test("a record receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didUpdate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "didUpdate callback was not called untill didUpdateRecord is called");

      store.didUpdateRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "didUpdate called after update");
});

test("a record receives a didCreate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    createRecord: function(store, type, record) {
      equal(callCount, 0, "didCreate callback was not called untill didCreateRecord is called");

      store.didCreateRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didCreate callback was not called yet");

  store.createRecord(Person, { id: 69, name: "Newt Gingrich" });
  store.commit();

  equal(callCount, 1, "didCreate called after commit");
});

test("a record receives a didDelete callback when it has finished deleting", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didDelete: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    deleteRecord: function(store, type, record) {
      equal(callCount, 0, "didDelete callback was not called untill didDeleteRecord is called");

      store.didDeleteRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didDelete callback was not called yet");

  person.deleteRecord();
  store.commit();

  equal(callCount, 1, "didDelete called after delete");
});

test("a record receives a becameInvalid callback when it became invalid", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    becameInvalid: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), true, "record should be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "becameInvalid callback was not called untill recordWasInvalid is called");

      store.recordWasInvalid(record, {bar: 'error'});
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "becameInvalid called after invalidating");
});

test("an ID of 0 is allowed", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 0, name: "Tom Dale" });
  equal(store.findAll(Person).objectAt(0).get('name'), "Tom Dale", "found record with id 0");
});

var StubModel, stubAdapter, store;

var receivedEvent = function(record, event) {
  return -1 !== record.receivedEvents.indexOf(event);
};

module("DS.Store - Adapter Callbacks", {
  setup: function() {
    StubModel = Ember.Object.extend({
      init: function() {
        this.resetEvents();
      },

      send: function(event) {
        this.receivedEvents.push(event);
      },

      resetEvents: function() {
        this.receivedEvents = [];
      },

      setupData: Ember.K
    });

    StubModel.reopenClass({
      _create: function() {
        return this.create.apply(this, arguments);
      }
    });

    stubAdapter = Ember.Object.create({
      extractId: function(type, hash) {
        return hash.id;
      },

      materialize: function(record, hash) {
        record.materializedData = hash;
      }
    });

    store = DS.Store.create({ adapter: stubAdapter });
  },

  teardown: function() {
    stubAdapter.destroy();
    store.destroy();
  }
});

test("An adapter can notify the store that records were updated by calling `didUpdateRecord`.", function() {
  expect(11);

  var tom, yehuda, transaction;

  stubAdapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords, 'length'), 2, "precond - two updated records are passed to `commit`");

    ok(!receivedEvent(tom, 'didCommit'), "didCommit was not sent");
    ok(!receivedEvent(yehuda, 'didCommit'), "didCommit was not sent");
    ok(!receivedEvent(tom, 'didChangeData'), "didChangeData was not sent");
    ok(!receivedEvent(yehuda, 'didChangeData'), "didChangeData was not sent");

    store.didUpdateRecord(tom, { id: 1, name: "Tom Dale", updatedAt: "now" });
    store.didUpdateRecord(yehuda, { id: 2, name: "Yehuda Katz", updatedAt: "now!" });

    ok(receivedEvent(tom, 'didCommit'), "didCommit was sent");
    ok(receivedEvent(yehuda, 'didCommit'), "didCommit was sent");
    ok(receivedEvent(tom, 'didChangeData'), "didChangeData was sent");
    ok(receivedEvent(yehuda, 'didChangeData'), "didChangeData was sent");

    store.materializeData(tom);
    store.materializeData(yehuda);

    deepEqual(tom.materializedData, {
      id: 1,
      name: "Tom Dale",
      updatedAt: "now"
    }, "hash provided to `didUpdateRecord` for tom replaces the hash provided to `load`");

    deepEqual(yehuda.materializedData, {
      id: 2,
      name: "Yehuda Katz",
      updatedAt: "now!"
    }, "hash provided to `didUpdateRecord` for yehuda replaces the hash provided to `load`");
  };

  store.load(StubModel, { id: 1, name: "Braaaahm Dale" });
  store.load(StubModel, { id: 2, name: "Gentile Katz" });

  tom = store.find(StubModel, 1);
  yehuda = store.find(StubModel, 2);
  transaction = tom.get('transaction');

  transaction.recordBecameDirty('updated', tom);
  transaction.recordBecameDirty('updated', yehuda);

  tom.resetEvents();
  yehuda.resetEvents();

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that multiple records were updated by passing an array to `didUpdateRecords`.", function() {
  expect(11);

  var tom, yehuda, transaction;

  stubAdapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords, 'length'), 2, "precond - two updated records are passed to `commit`");

    ok(!receivedEvent(tom, 'didCommit'), "didCommit was not sent");
    ok(!receivedEvent(yehuda, 'didCommit'), "didCommit was not sent");
    ok(!receivedEvent(tom, 'didChangeData'), "didChangeData was not sent");
    ok(!receivedEvent(yehuda, 'didChangeData'), "didChangeData was not sent");

    store.didUpdateRecords(updatedRecords, [ { id: 1, name: "Tom Dale", updatedAt: "now" }, { id: 2, name: "Yehuda Katz", updatedAt: "now!" } ]);

    ok(receivedEvent(tom, 'didCommit'), "didCommit was sent");
    ok(receivedEvent(yehuda, 'didCommit'), "didCommit was sent");
    ok(receivedEvent(tom, 'didChangeData'), "didChangeData was sent");
    ok(receivedEvent(yehuda, 'didChangeData'), "didChangeData was sent");

    store.materializeData(tom);
    store.materializeData(yehuda);

    deepEqual(tom.materializedData, {
      id: 1,
      name: "Tom Dale",
      updatedAt: "now"
    }, "hash provided to `didUpdateRecords` for tom replaces the hash provided to `load`");

    deepEqual(yehuda.materializedData, {
      id: 2,
      name: "Yehuda Katz",
      updatedAt: "now!"
    }, "hash provided to `didUpdateRecords` for yehuda replaces the hash provided to `load`");
  };

  store.load(StubModel, { id: 1, name: "Braaaahm Dale" });
  store.load(StubModel, { id: 2, name: "Gentile Katz" });

  tom = store.find(StubModel, 1);
  yehuda = store.find(StubModel, 2);
  transaction = tom.get('transaction');

  transaction.recordBecameDirty('updated', tom);
  transaction.recordBecameDirty('updated', yehuda);

  tom.resetEvents();
  yehuda.resetEvents();

  store.commit();

  // there is nothing to commit, so the adapter's commit method
  // should not be called again.
  store.commit();
});
