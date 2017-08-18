var _elm_lang$virtual_dom$VirtualDom_Debug$wrap;
var _elm_lang$virtual_dom$VirtualDom_Debug$wrapWithFlags;

var _elm_lang$virtual_dom$Native_VirtualDom = function() {

  var YOGA_KEY = 'YOGA';
  var EVENT_KEY = 'EVENT';

  ////////////  VIRTUAL DOM NODES  ////////////

  function leaf(tag, factList) {
    return {
      type: 'leaf',
      tag: tag,
      facts: organizeFacts(factList)
    }
  }

  function parent(factList, kidList) {
    var children = [];
    var descendantsCount = 0;
    while (kidList.ctor !== '[]') {
      var kid = kidList._0;
      descendantsCount += (kid.descendantsCount || 0);
      children.push(kid);
      kidList = kidList._1;
    }
    descendantsCount += children.length;

    return {
      type: 'parent',
      facts: organizeFacts(factList),
      children: children,
      descendantsCount: descendantsCount
    };
  }

  function map(tagger, node) {
    return {
      type: 'tagger',
      tagger: tagger,
      node: node,
      descendantsCount: node.descendantsCount || 0
      // descendantsCount is implicitly treated as 0
      // TODO descendantsCount of map should increment by 1
    };
  }

  function thunk(func, args, thunk) {
    return {
      type: 'thunk',
      func: func,
      args: args,
      thunk: thunk,
      node: undefined
      // descendantsCount: node.descendantsCount || 0
      // TODO should we be tracking the descendantsCount here?
      // I think we should actually be resetting the offset here.
      // After further thought, I'm pretty sure we should be tracking node's descendantsCount
    };
  }

  function lazy(fn, a) {
    return thunk(fn, [a], function() {
      return fn(a);
    });
  }

  function lazy2(fn, a, b) {
    return thunk(fn, [a, b], function() {
      return A2(fn, a, b);
    });
  }

  function lazy3(fn, a, b, c) {
    return thunk(fn, [a, b, c], function() {
      return A3(fn, a, b, c);
    });
  }


  // FACTS


  function organizeFacts(factList) {
    var facts = {};

    while (factList.ctor !== '[]') {
      var entry = factList._0;
      var key = entry.key;

      if (key == YOGA_KEY || key === EVENT_KEY) {
        var subFacts = facts[key] || {};
        subFacts[entry.realKey] = entry.value;
        facts[key] = subFacts;
      } else {
        facts[key] = entry.value;
      }

      factList = factList._1;
    }

    return facts;
  }


  ////////////  PROPERTIES  ////////////


  function property(key, value) {
    return {
      key: key,
      value: value
    };
  }

  function yogaProperty(key, value) {
    return {
      key: YOGA_KEY,
      realKey: key,
      value: value
    };
  }

  function on(name, decoder) {
    return {
      key: EVENT_KEY,
      realKey: name,
      value: decoder
    };
  }

  function mapProperty(func, property) {
    if (property.key !== EVENT_KEY) {
      return property;
    }
    return on(
      property.realKey,
      A2(_elm_lang$core$Json_Decode$map, func, property.value)
    );
  }


  ////////////  DIFF  ////////////


  function makeChangePatch(type, data) {
    return {
      ctor: 'change',
      type: type,
      data: data,
      node: undefined
    };
  }


  function makeAtPatch(index, patch) {
    return {
      ctor: 'at',
      index: index,
      patch: patch
    };
  }


  function makeBatchPatch(patches) {
    return {
      ctor: 'batch',
      patches: patches
    }
  }

  function combinePatches(newPatch, maybeBatchPatch) {
    if (typeof maybeBatchPatch !== 'undefined') {
      if (maybeBatchPatch.ctor !== 'batch') {
        return makeBatchPatch([maybeBatchPatch, newPatch]);
      } else {
        maybeBatchPatch.patches.push(newPatch);
        return maybeBatchPatch;
      }
    } else {
      return newPatch;
    }
  }

  function renderData(vNode, handlerList, offset) {
    return {
      vNode: vNode,
      handlerList: handlerList,
      offset: offset
    };
  }

  function diff(a, b, aOffset, bOffset, dominatingTagger, taggerList) {
    if (a === b) {
      return;
    }

    var aType = a.type;
    var bType = b.type;

    if (aType !== bType) {
      if (aType === 'tagger') {
        // REMOVING A TAGGER
        // 1. Remove cursor.next from the taggerList.
        // 2. Move the handlers from cursor.next to the appropriate
        // location in the handlerList of dominatingTagger.
        //    (a) They belong after the handler cursor of dominatingTagger.
        //    (b) The cursor should remain unchanged.
        // 3. Update the parent of the handlers to be the parent of
        // the dominatingTagger.
        //    (a) I guess you'd need to iterate here.

        var removedTagger = taggerList.cursor.next;
        taggerList.cursor.next = removedTagger.next;

        var dominatingHandlerList = dominatingTagger.handlerList;
        var currentCursor = dominatingHandlerList.cursor;
        var handlerNode = removedTagger.handlerList.head;
        while (typeof handlerNode !== 'undefined') {
          handlerNode.parent = parentTagger;
          // TODO maybe also decrement handlerNode.offset
          insertAfterCursor(handlerNode, dominatingHandlerList);
          dominatingHandlerList.cursor = handlerNode;
          handlerNode = handlerNode.next;
        }
        dominatingHandlerList.cursor = currentCursor;

        // TODO increment aOffset but not bOffset
        return diff(a.node, b, aOffset, bOffset, parentTagger, taggerList);
      } else if (bType === 'tagger') {
        // ADDING A TAGGER
        // 1. Create the new tagger.
        //    (a) Set the parent to be the dominatingTagger.
        // 2. Insert it into the correct position in taggerList.
        //    (a) It belongs right after the cursor.
        //    (b) The cursor should be moved forward.
        // 3. Move any handlers that should belong to it from dominatingTagger
        // handlerList into its own handlerList.
        //    (a) Start looping from the handler *after* the cursor.
        //    (b) Compare the offset to aOffset + (a.descendantsCount || 0)

        // create the new tagger

        var newTagger = makeTaggerNode(vNode.tagger, bOffset);
        newTagger.parent = dominatingTagger;

        // insert it into the correct position in taggerList

        newTagger.next = taggerList.cursor.next;
        taggerList.cursor.next = newTagger;
        taggerList.cursor = newTagger;

        // move appropriate handlers from dominatingTagger to newTagger

        var lastOffset = aOffset + (a.descendantsCount || 0);
        newTagger.handlerList = spliceFromCursorTo(
          lastOffset, dominatingTagger.handlerList);

        // TODO increment bOffset but not aOffset
        return diff(a, b.node, aOffset, bOffset, newTagger, taggerList);
      } else {
        // REDRAW
        // 1. Redraw the node.
        // 2. Run spliceFromCursorTo with aOffset + (a.descendantsCount || 0) on
        // the tagger and dominatingTagger.handler lists.

        // Redraw the node.

        var partialHandlerList = [];
        prerender(b, bOffset, dominatingTagger, taggerList, partialHandlerList);

        // Remove the extra taggers and handlers

        var lastOffset = aOffset + (a.descendantsCount || 0);
        spliceFromCursorTo(lastOffset, taggerList);
        spliceFromCursorTo(lastOffset, dominatingTagger.handlerList);

        return makeChangePatch('redraw', renderData(b, partialHandlerList, bOffset));
      }
    }

    // Now we know that both nodes are the same type.
    switch (bType) {
      case 'thunk':
        var aArgs = a.args;
        var bArgs = b.args;
        var i = aArgs.length;
        var same = a.func === b.func && i === bArgs.length;
        while (same && i--) {
          same = aArgs[i] === bArgs[i];
        }
        if (same) {
          b.node = a.node;
          return;
        }
        b.node = b.thunk();
        return diff(a.node, b.node, aOffset, bOffset dominatingTagger, taggerList);

      case 'tagger':
        // NEXT TAGGER
        // 1. Update the offset of the previous tagger to bOffset.
        // 2. Retrieve the next tagger.
        //    (a) That is, cursor.next.
        //    (b) Move the cursor forward to the nextTagger.
        // 3. Update the function on the nextTagger.

        // TODO update offsets with lazy?

        var nextTagger = taggerList.cursor.next;
        taggerList.cursor = nextTagger;

        dominatingTagger.offset = bOffset;
        nextTagger.func = b.tagger;

        // TODO increment aOffset and bOffset
        return diff(a.node, b.node, aOffset, bOffset, nextTagger, taggerList);

      case 'leaf':
        var bTag = b.tag;

        if (a.tag !== bTag) {
          // REDRAW OF LEAF
          // 1. Call addHandlers on the node.
          // 2. Remove the extra handlers with spliceFromCursorTo.

          var partialHandlerList = [];
          var handlers = b.facts[EVENT_KEY];
          if (typeof handlers !== 'undefined') {
            partialHandlerList.push(
              addHandlers(handlers, bOffset, dominatingTagger));
          }

          spliceFromCursorTo(
            aOffset + (a.descendantsCount || 0),
            dominatingTagger.handlerList);

          return makeChangePatch('redraw', renderData(b, handlerList, bOffset));
        }


        // TODO remove the event facts from the rest of the facts
        // and call updateHandlers.

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          factsDiff.tag = bTag;
          return makeChangePatch('facts', factsDiff);
        }
        return;

      case 'parent':
        var patch;

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          factsDiff.tag = 'parent';
          patch = makeChangePatch('facts', factsDiff);
        }

        return diffChildren(a, b, patch, aOffset, bOffset, dominatingTagger, taggerList);
    }
  }


  function updateHandlers(offset, aHandlers, bHandlers, dominatingTagger) {
    var handlerList = dominatingTagger.handlerList;

    if (typeof aHandlers !== 'undefined') {
      if (typeof bHandlers === 'undefined') {
        var removedHandlerNode = handlerList.cursor.next;
        handlerList.cursor.next = removedHandlerNode.next;
        return makeChangePatch('remove-all-handlers', undefined);
      }
    } else if (typeof bHandlers !== 'undefined') {
      return makeChangePatch(
        'add-handlers', addHandlers(bHandlers, offset, dominatingTagger));
    }

    var cursor = handlerList.cursor;

    // update the old cursor's offset
    cursor.offset = offset;

    // we need the cursor to wrap so that it resets for the next diff cycle
    handlerList.cursor = typeof cursor !== 'undefined' && typeof cursor.next !== 'undefined' ?
      cursor.next :
      handlerList.head;

    var handlerNodeFuncs = handlerList.cursor.funcs;
    var patch;

    var removedHandlers = [];
    for (var aHandlerName in aHandlers) {
      if (!(aHandlerName in bHandlers)) {
        removedHandlers.push(aHandlerName);
        handlerNodeFuncs[aHandlerName] = undefined;
      }
    }

    if (removedHandlers.length > 0) {
      patch = makeChangePatch('remove-handlers', removedHandlers);
    }

    var addedHandlers = {};
    var didAddHandlers = false;
    for (var bHandlerName in bHandlers) {
      var bHandlerCallback = bHandlers[bHandlerName];
      if (!(bHandlerName in aHandlers)) {
        addedHandlers[bHandlerName] = bHandlerCallback;
        didAddHandlers = true;
      }
      handlerNodeFuncs[bHandlerName] = bHandlerCallback;
    }

    if (didAddHandlers) {
      patch = combinePatches(
        makeChangePatch('add-handlers', addedHandlers), patch);
    }

    return patch;
  }


  function diffFacts(a, b, category) {
    var diff;

    // look for changes and removals
    for (var aKey in a) {
      if (aKey === YOGA_KEY || aKey === EVENT_KEY) {
        var subDiff = diffFacts(a[aKey], b[aKey] || {}, aKey);
        if (subDiff) {
          diff = diff || {};
          diff[aKey] = subDiff;
        }
        continue;
      }

      if (!(aKey in b)) {
        diff = diff || {};
        diff[aKey] = undefined; // TODO consider making this null
        continue;
      }

      var aValue = a[aKey];
      var bValue = b[aKey];

      // reference equal, so don't worry about it
      if (aValue === bValue) {
        continue;
      }

      diff = diff || {};
      diff[aKey] = bValue;
    }

    // add new stuff
    for (var bKey in b) {
      if (!(bKey in a)) {
        diff = diff || {};
        diff[bKey] = b[bKey];
      }
    }

    return diff;
  }


  function diffChildren(aParent, bParent, patch, aOffset, bOffset, dominatingTagger, taggerList) {
    var aChildren = aParent.children;
    var bChildren = bParent.children;

    var aLen = aChildren.length;
    var bLen = bChildren.length;

    // PAIRWISE DIFF EVERYTHING ELSE

    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      var aChild = aChildren[i];
      var childPatch = diff(aChild, bChildren[i], ++aOffset, ++bOffset, dominatingTagger, taggerList);

      if (typeof childPatch !== 'undefined') {
        combinePatches(makeAtPatch(i, childPatch), patch);
      }

      aOffset += aChild.descendantsCount || 0;
      bOffset += bChild.descendantsCount || 0;
    }

    // FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

    // TODO Also consider adding aParent's descendantsCount to the eventOffset

    if (aLen > bLen) {
      patch = combinePatches(makeChangePatch('remove-last', aLen - bLen), patch);
    } else if (aLen < bLen) {
      var newChildren = bChildren.slice(aLen);
      for (var i = 0; i < newChildren.length; i++) {

        // TODO remember to splice taggers and handlers
        var partialHandlerList = [];
        prerender(newChildren[i], bOffset, dominatingTagger, taggerList, partialHandlerList);
      }
      var appendPatch = makeChangePatch('append', renderData(newChildren, partialHandlerList, bOffset));
      patch = combinePatches(appendPatch, patch);
    }

    return patch;
  }


  ////////////  EVENTS  ////////////


  function makeTaggerNode(func, offset) {
    return {
      func: func,
      offset: offset,
      handlerList: makeCursorList(),
      parent: undefined,
      next: undefined
    }
  }

  function makeHandlerNode(initialHandlers, offset) {
    var handlerNode = {
      funcs: initialHandlers,
      offset: offset,
      parent: undefined,
      next: undefined,
      callback: undefined
    };

    handlerNode.callback = function(eventName, event) {
      var result = A2(_elm_lang$core$Native_Json.run, handlerNode.funcs[eventName], event);
      var node = handlerNode;
      while (typeof(node = node.parent) !== 'undefined') {
        result = node.func(result);
      }
    };

    return handlerNode;
  }

  function makeCursorList() {
    return {
      head: undefined,
      cursor: undefined
    };
  }

  function makeSwiftHandlerNode(handlers, offset, callback) {
    return {
      funcs: handlers,
      offset: offset,
      callback: callback
    };
  }

  function spliceFromCursorTo(offset, list) {
    var node = list.cursor.next;
    var prev;

    var newList = makeCursorList();
    newList.head = node;

    while (typeof node !== 'undefined' && node.offset <= offset) {
      prev = node;
      node = node.next;
    }

    prev.next = undefined;
    list.cursor.next = node;

    return newList;
  }

  function insertAfterCursor(item, list) {
    if (typeof list.cursor !== 'undefined') {
      item.next = list.cursor.next;
      list.cursor.next = item;
    } else {
      item.next = list.head;
      list.head = item;
    }
  }

  function addHandlers(handlers, offset, dominatingTagger) {
    var newHandlerNode = makeHandlerNode(handlers, offset);
    newHandlerNode.parent = eventNode;

    insertAfterCursor(newHandlerNode, dominatingTagger.handlerList);
    dominatingTagger.handlerList.cursor = newHandlerNode;

    return makeSwiftHandlerNode(handlers, offset, newHandlerNode.callback);
  }


  ////////////  PRERENDER  ////////////


  // TODO a lot of cool stuff is happening here. maybe document it?
  function prerender(vNode, offset, dominatingTagger, taggerList, handlerList) {
    switch (vNode.type) {
      case 'thunk':
        if (!vNode.node) {
          vNode.node = vNode.thunk();
          prerender(vNode.node, offset, dominatingTagger, taggerList, handlerList);
        }
        return;

      case 'tagger':
        var newTagger = makeTaggerNode(vNode.tagger, offset);
        newTagger.parent = dominatingTagger;

        // Insert the newTagger after the cursor and move the cursor forward
        // taggerList can never be empty due to root event node
        newTagger.next = taggerList.cursor.next;
        taggerList.cursor.next = newTagger;
        taggerList.cursor = newTagger;

        prerender(vNode.node, offset, newTagger, taggerList, handlerList);
        return;

      case 'leaf':
        var handlers = vNode.facts[EVENT_KEY];
        if (typeof handlers !== 'undefined') {
          handlerList.push(
            addHandlers(handlers, offset, dominatingTagger));
        }
        return;

      case 'parent':
        var handlers = vNode.facts[EVENT_KEY];
        if (typeof handlers !== 'undefined') {
          handlerList.push(
            addHandlers(handlers, offset, dominatingTagger));
        }

        var children = vNode.children;
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          prerender(child, ++offset, dominatingTagger, taggerList, handlerList);
          var descendantsCount = child.descendantsCount || 0;
          offset += descendantsCount;
        }
        return;
    }
  }


  // PROGRAMS

  var program = makeProgram(checkNoFlags);

  // absolutely need flagDecoder and object, moduleName, debugMetadata b/c compiler
  function makeProgram(flagChecker) {
    return F2(function(debugWrap, impl) {
      return function(flagDecoder) {
        return function(object, moduleName, debugMetadata) {
          var checker = flagChecker(flagDecoder, moduleName);
          normalSetup(impl, object, checker);
        };
      };
    });
  }

  function staticProgram(vNode) {
    var nothing = _elm_lang$core$Native_Utils.Tuple2(
      _elm_lang$core$Native_Utils.Tuple0,
      _elm_lang$core$Platform_Cmd$none
    );
    return A2(program, _elm_lang$virtual_dom$VirtualDom_Debug$wrap, {
      init: nothing,
      view: function() {
        return vNode;
      },
      update: F2(function() {
        return nothing;
      }),
      subscriptions: function() {
        return _elm_lang$core$Platform_Sub$none;
      }
    })();
  }


  // FLAG CHECKERS

  function checkNoFlags(flagDecoder, moduleName) {
    return function(init, flags, domNode) {
      if (typeof flags === 'undefined') {
        return init;
      }

      var errorMessage =
        'The `' + moduleName + '` module does not need flags.\n' +
        'Initialize it with no arguments and you should be all set!';

      crash(errorMessage);
    };
  }

  function crash(errorMessage) {
    throw new Error(errorMessage);
  }


  //  NORMAL SETUP

  function normalSetup(impl, object, flagChecker) {
    object['start'] = function initialize(flags) {
      return _elm_lang$core$Native_Platform.initialize(
        flagChecker(impl.init, flags),
        impl.update,
        impl.subscriptions,
        normalRenderer(impl.view)
      );
    };
  }

  function normalRenderer(view) {
    return function(tagger, initialModel) {
      var currNode = view(initialModel);

      // TODO maybe rootEventNode's offset should be -1
      var rootEventNode = makeTaggerNode(tagger, 0);
      var taggerList = makeCursorList();
      taggerList.head = rootEventNode;
      taggerList.cursor = rootEventNode;

      var handlerList = [];
      prerender(currNode, 0, rootEventNode, taggerList, handlerList);

      // exposed by JSCore
      initialRender(currNode, handlerList);

      // called by runtime every time model changes
      return function stepper(model) {
        var nextNode = view(model);

        taggerList.cursor = rootEventNode;
        var patches = diff(currNode, nextNode, 0, rootEventNode, taggerList);

        if (typeof patches !== 'undefined') {
          // exposed by JSCore
          applyPatches(patches);
        }
        currNode = nextNode;
      };
    };
  }

  return {
    parent: F2(parent),
    leaf: F2(leaf),
    map: F2(map),

    on: F2(on),
    property: F2(property),
    yogaProperty: F2(yogaProperty),
    mapProperty: F2(mapProperty),

    lazy: F2(lazy),
    lazy2: F3(lazy2),
    lazy3: F4(lazy3),

    program: program,
    staticProgram: staticProgram
  };

}();
