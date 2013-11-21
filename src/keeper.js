/*globals playjs:true*/
/*
* Keeper is just a method for keeping track of all the callbacks.
*/

playjs.Keeper = function(){
  this.init();
};

playjs.Keeper.prototype.init = function(){
  this.data = {};
};

playjs.Keeper.prototype.getUUID = function(){
  // Create a random id. #http://stackoverflow.com/a/2117523/564191
  return 'listener-xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
};

playjs.Keeper.prototype.has = function(event, id){
  if (!this.data.hasOwnProperty(event)){
    return false;
  }

  if (playjs.isNone(id)){
    return true;
  }

  // Figure out if we have the event.
  var events = this.data[event];

  for (var i = 0; i < events.length; i++){
    if (events[i].id === id){
      return true;
    }
  }

  return false;
};

playjs.Keeper.prototype.add = function(id, event, cb, ctx, one){
  var d = {
    id: id,
    event: event,
    cb: cb,
    ctx: ctx,
    one: one
  };

  if (this.has(event)){
    this.data[event].push(d);
  } else {
    this.data[event] = [d];
  }
};

playjs.Keeper.prototype.execute = function(event, id, data){
  if (!this.has(event, id)){
    return false;
  }

  var keep = [],
    execute = [];

  for (var i=0; i< this.data[event].length; i++){
    var d = this.data[event][i];

    if (!playjs.isNone(id) && d.id !== id){
      continue;
    }

    execute.push({
      cb: d.cb,
      ctx: d.ctx? d.ctx: window,
      data: data
    });

    if (d.one === false){
      keep.push(d);
    }
  }

  if (keep.length === 0){
    delete this.data[event];
  } else {
    this.data[event] = keep;
  }

  // We need to execute everything after we deal with the one stuff. otherwise
  // we have issues to order of operations.
  for (var n=0; n < execute.length; n++){
    var e = execute[n];
    e.cb.call(e.ctx, e.data);
  }
};

playjs.Keeper.prototype.on = function(id, event, cb, ctx){
  this.add(id, event, cb, ctx, false);
};

playjs.Keeper.prototype.one = function(id, event, cb, ctx){
  this.add(id, event, cb, ctx, true);
};

playjs.Keeper.prototype.off = function(event, cb){
  // We should probably restructure so this is a bit less of a pain.
  var listeners = [];

  if (!this.data.hasOwnProperty(event)){
    return listeners;
  }

  var keep = [];

  // Loop through everything.
  for (var i=0; i< this.data[event].length; i++){
    var data = this.data[event][i];
    // If we only keep if there was a CB and the CB is there.
    if (!playjs.isNone(cb) && data.cb !== cb) {
      keep.push(data);
    } else if (!playjs.isNone(data.id)) {
      listeners.push(data.id);
    }
  }

  if (keep.length === 0){
    delete this.data[event];
  } else {
    this.data[event] = keep;
  }

  return listeners;
};
