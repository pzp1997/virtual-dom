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
      // TODO I think we should actually be resetting the offset here.
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

  // TODO add delta here
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
        // TODO uncomment this if we keep tail
        // if (typeof removedTagger.next === 'undefined') {
        //   taggerList.tail = taggerList.cursor;
        // }

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

        // var parentTagger = dominatingTagger;
        // var parentHandlerList = parentTagger.handlerList;

        // var handlerList = removedTagger.handlerList;
        // var handlerNode = handlerList.head;
        // while (typeof handlerNode !== 'undefined') {
        //   handlerNode.parent = parentTagger;
        //   handlerNode = handlerNode.next;
        // }

        // handlerList.tail.next = parentHandlerList.cursor.next;
        // parentHandlerList.cursor.next = handlerList.head;


        // TODO attach handlers to the end of the parent's handler list
        // parentTagger.handlerTail.next =

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
        // TODO uncomment if we keep tail
        // if (typeof taggerList.cursor.next === 'undefined') {
        //   taggerList.tail = newTagger;
        // }

        // move appropriate handlers from dominatingTagger to newTagger

        var lastOffset = aOffset + (a.descendantsCount || 0);
        newTagger.handlerList = spliceFromCursorTo(
          lastOffset, dominatingTagger.handlerList);

        // TODO increment bOffset but not aOffset
        return diff(a, b.node, aOffset, bOffset, newTagger, taggerList);
      } else {
        // REDRAW
        // 1. Remove the taggers below the node that is being redrawn.
        // 2. Remove the handlers from the dominatingTagger that are
        // going to be redrawn.
        // 3. Redraw the node.
        // 4. Re-attach the taggers that we should not have removed.
        // 5. Re-attach the handlers that we should not have removed.
        //
        // OR (assuming that items are inserted at the cursor)
        //
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




        // TODO fix naming here

        // clip the tagger list
        // var cursor = taggerList.cursor;
        //
        // var restOfTaggers = cursor.next;
        // cursor.next = undefined;
        //
        // var oldTaggerListTail = taggerList.tail;
        // taggerList.tail = cursor;
        //
        // // clip the handler list at aOffset
        // var next = dominatingTagger.handlerHead;
        // var node = searchList(next, aOffset);
        // if (typeof node !== 'undefined') {
        //   next = node.next;
        // }
        //
        // if (typeof next !== 'undefined') {
        //   if (typeof node !== 'undefined') {
        //     node.next = undefined;
        //   } else {
        //     dominatingTagger.handlerHead = undefined;
        //   }
        //   var oldTail = dominatingTagger.handlerTail;
        //   dominatingTagger.handlerTail = node;
        // }

        // add taggers, handlers that exist on the redrawn node
        // var partialHandlerList = [];
        // prerender(b, bOffset, dominatingTagger, taggerList, partialHandlerList);

        // TODO if doubly-linked just go in reverse from tail and don't worry about explicitly cutting stuff.

        // var lastOffsetPlusOne = aOffset + (a.descendantsCount || 0) + 1;
        //
        // // add whatever taggers come after
        // while (typeof restOfTaggers !== 'undefined' && restOfTaggers.offset < lastOffsetPlusOne) {
        //   restOfTaggers = restOfTaggers.next;
        // }
        //
        // if (typeof restOfTaggers !== 'undefined') {
        //   taggerList.cursor = restOfTaggers;
        //   taggerList.tail.next = restOfTaggers;
        //   taggerList.tail = oldTail;
        // }
        //
        // // add whatever handlers come after
        // var lastBadNode;
        // while (typeof next !== 'undefined' && next.offset < lastOffsetPlusOne) {
        //   lastBadNode = next;
        //   next = lastBadNode.next;
        // }
        //
        // if (typeof next !== 'undefined') {
        //   dominatingTagger.handlerTail.next = next;
        //   dominatingTagger.handlerTail = oldTail;
        // }
        //
        // return makeChangePatch('redraw', renderData(b, partialHandlerList, bOffset));
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

        // TODO update handlerList offsets as well?
        // TODO update offsets with lazy?

        // moveCursorForward(taggerList);

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


          // var node;
          // var next = dominatingTagger.handlerList.head;
          // while (typeof next !== 'undefined' && next.offset < aOffset) {
          //   node = next;
          //   next = node.next;
          // }
          //
          // // if (node and next are both undefined) {
          // //   empty handlers, no extra processing needed
          // // }
          // // if (only node is undefined) {
          // //   then all handlers are greater than offset, but not necessarily good
          // //   must process next after addHandlers
          // // }
          // // if (only next is undefined) {
          // //   end of handlers, no extra processing needed
          // // }
          // // if (both are defined) {
          // //   we have good and bad and need to splice
          // //   and we should process next after addHandlers
          // // }
          //
          // if (typeof next !== 'undefined') {
          //   if (typeof node !== 'undefined') {
          //     node.next = undefined;
          //   } else {
          //     dominatingTagger.handlerHead = undefined;
          //   }
          //   var oldTail = dominatingTagger.handlerTail;
          //   dominatingTagger.handlerTail = node;
          // }
          //
          // var partialHandlerList = [];
          // addHandlers(b, bOffset, dominatingTagger, partialHandlerList);
          //
          // var lastOffsetPlusOne = aOffset + (a.descendantsCount || 0) + 1;
          // var lastBadNode;
          // while (typeof next !== 'undefined' && next.offset < lastOffsetPlusOne) {
          //   lastBadNode = next;
          //   next = lastBadNode.next;
          // }
          //
          // // if (both next and lastBadNode are undefined) {
          // //   impossible case because of initial check. in theory this means
          // //   no extra processing needed
          // // }
          // //
          // // if (only next is undefined) {
          // //   everything is bad, so do not attach anything
          // // }
          // //
          // // if (only lastBadNode is undefined) {
          // //   everything is good, so attach everything
          // // }
          // //
          // // if (both are defined) {
          // //   some bad followed by some good. attach next to handlerTail
          // // }
          //
          // if (typeof next !== 'undefined') {
          //   dominatingTagger.handlerTail.next = next;
          //   dominatingTagger.handlerTail = oldTail;
          // }
          //
          // return makeChangePatch('redraw', renderData(b, handlerList, bOffset));
        }

        // Put this in a function and re-use for parent and keyed
        // Also call this only if the fact diff comes up positive


        // if (handlers before and now) {
        //   update patch
        // } else if (only handlers before) {
        //   remove patch
        // } else if (only handlers now) {
        //   add patch
        // }





        //// 1. Check if this leaf had handlers. If so...
        //// 2. Check the facts diff for events.
        //// 3. Make whatever changes are necessary to the callbacks.
        //// 4. If there are changes in the subscribed events, make a patch.
        //// 5. If all of the events are removed from the node, remove the
        //// handler from the handlerList by skipping over it.
        //// 6. Update the offset
        //// 7. If the handler is not removed, move the cursor forward.

        //// 1. If the leaf did not have handlers but does now...
        //// 2. Create a new handler
        //// 3. Insert it into the handlerList.



        // // TODO move this around possibly?
        // if (typeof a.facts[EVENT_KEY] !== 'undefined') {
        //   var handlerList = dominatingTagger.handlerList;
        //   handlerList.cursor = handlerList.cursor.next;
        // }

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          // var eventFacts = factsDiff[EVENT_KEY];
          // if (typeof eventFacts !== 'undefined') {
          //
          // }
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
    // var aHandlers = a.facts[EVENT_KEY];
    // var bHandlers = b.facts[EVENT_KEY];

    // event patches
    // add-handlers, data is the new handler node (maybe in swift friendly form)
    // remove-handlers, data is the names of the removed events
    // remove-all-handlers, no data

    // remove the event facts from the facts diff

    if (typeof aHandlers !== 'undefined') {
      if (typeof bHandlers === 'undefined') {
        var removedHandlerNode = handlerList.cursor.next;
        handlerList.cursor.next = removedHandlerNode.next;
        // TODO uncomment if we keep tail
        // if (typeof removedHandlerNode.next === 'undefined') {
        //   handlerList.tail = handlerList.cursor;
        // }
        return makeChangePatch('remove-all-handlers', undefined);
      }
    } else if (typeof bHandlers !== 'undefined') {
      return makeChangePatch(
        'add-handlers', addHandlers(bHandlers, offset, dominatingTagger));
    }

    var cursor = handlerList.cursor;

    cursor.offset = offset;

    // we need the cursor to wrap so that it resets for the next diff cycle
    // if (typeof handlerList.cursor !== 'undefined' && typeof
    //   handlerList.cursor.next !== 'undefined') {
    //   handlerList.cursor = handlerList.cursor.next
    // } else {
    //   handlerList.cursor = head;
    // }

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

  // for (handler in handlersDiff) {
  //   if (typeof handler !== 'undefined') {
  //
  //   } else {
  //     removedHandlers.push(handler);
  //   }
  // }

  // if (typeof aHandlers !== 'undefined') {
  //   if (typeof bHandlers !== 'undefined') {
  //     // both -- add-handlers + remove-handlers
  //   } else {
  //     // only old -- remove-all-handlers
  //     var removedHandlerNode = handlerList.cursor.next;
  //     handlerList.cursor.next = removedHandlerNode.next;
  //     // TODO uncomment if we keep tail
  //     // if (typeof removedHandlerNode.next === 'undefined') {
  //     //   handlerList.tail = handlerList.cursor;
  //     // }
  //     return makeChangePatch('remove-all-handlers', undefined);
  //   }
  // } else {
  //   // only new -- add-handlers
  //   return makeChangePatch('add-handlers',
  //     addHandlers(bHandlers, bOffset, dominatingTagger));
  // }
  // }


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
      tail: undefined,
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
    // TODO uncomment if we keep tail
    // newList.tail = prev;

    list.cursor.next = node;
    // TODO uncomment this if we keep tail
    // if (typeof node === 'undefined') {
    //   list.tail = list.cursor;
    // }

    return newList;
  }

  function insertAfterCursor(item, list) {
    if (typeof list.cursor !== 'undefined') {
      item.next = list.cursor.next;
      list.cursor.next = item;
      // TODO uncomment this if we keep tail
      // if (typeof handlerList.cursor.next === 'undefined') {
      //   handlerList.tail = newHandlerNode;
      // }
    } else {
      item.next = list.head;
      list.head = item;
    }
  }

  function moveCursorForward(list) {
    list.cursor = typeof list.cursor !== 'undefined' ?
      list.cursor.next :
      list.head;
  }

  // function searchList(startNode, offset) {
  //   var node;
  //   var next = startNode;
  //   while (typeof next !== 'undefined' && next.offset < offset) {
  //     node = next;
  //     next = node.next;
  //   }
  //   return node;
  // }

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
  var programWithFlags = makeProgram(checkYesFlags);

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

  function checkYesFlags(flagDecoder, moduleName) {
    return function(init, flags, domNode) {
      if (typeof flagDecoder === 'undefined') {
        var errorMessage =
          'Are you trying to sneak a Never value into Elm? Trickster!\n' +
          'It looks like ' + moduleName + '.main is defined with `programWithFlags` but has type `Program Never`.\n' +
          'Use `program` instead if you do not want flags.'

        crash(errorMessage);
      }

      var result = A2(_elm_lang$core$Native_Json.run, flagDecoder, flags);
      if (result.ctor === 'Ok') {
        return init(result._0);
      }

      var errorMessage =
        'Trying to initialize the `' + moduleName + '` module with an unexpected flag.\n' +
        'I tried to convert it to an Elm value, but ran into this problem:\n\n' +
        result._0;

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
      taggerList.tail = rootEventNode;
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
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
