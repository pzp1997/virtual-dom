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
    }
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

  function renderData(vNode, handlerList, offset) {
    return {
      vNode: vNode,
      handlerList: handlerList,
      offset: offset
    };
  }


  // TODO add delta here
  function diff(a, b, offset, dominatingTagger, taggerList) {
    if (a === b) {
      return;
    }

    var bType = b.type;

    if (a.type !== bType) {
      if (aType === 'tagger') {
        // TODO remove dominatingTagger from taggerList. Maybe make taggerList doubly linked to make this easier.
        var parent = dominatingTagger.parent;
        var handlerNode = dominatingTagger.handlerHead;
        while (typeof handlerNode !== 'undefined') {
          handlerNode.parent = parent;
          handlerNode = handlerNode.next;
        }
        return diff(a.node, b, offset, parent, taggerList);
      } else if (bType === 'tagger') {
        // TODO should be bOffset in line below
        var newTagger = makeTaggerNode(vNode.tagger, offset);

        newTagger.parent = dominatingTagger;

        // Okay to skip root event node
        // TODO consider starting at dominatingTagger
        var node = dominatingTagger;
        var next;
        while (next = node.next && next.offset < offset) {
          node = next;
        }

        if (typeof next !== 'undefined') {
          newTagger.next = next;
        } else {
          taggerList.tail = newTagger;
        }
        node.next = newTagger;

        // TODO move the handlers over to the newTagger

        node = dominatingTagger.handlerHead;
        if (typeof node !== 'undefined') {
          while (next = node.next && next.offset < offset) {
            node = next;
          }

          if (typeof next !== 'undefined') {
            var lastOffset = offset + (a.descendantsCount || 0);
            if (next.offset <= lastOffset) {
              newTagger.handlerHead = next;
              var lastNode = next;

              while (next = lastNode.next && next.offset <= lastOffset) {
                lastNode = next;
              }

              if (typeof next !== 'undefined') {
                lastNode.next = undefined;
              } else {
                dominatingTagger.handlerTail = node;
              }
              node.next = next;
              newTagger.handlerTail = lastNode;
            }
          }
        }

        return diff(a, b.node, offset, newTagger, taggerList);
      } else {

        // TODO splice out any taggers and handlers whose offsets are between
        // the current offset and the current offset + the descendantsCount of
        // the node we are redrawing. Then pass to pre-render. Note that in
        // order to maintain order, we must only pass the taggers before the
        // one being added and then attached the ones that come after once
        // prerender is completed!


        var node = dominatingTagger.next;
        dominatingTagger.next = undefined;

        var oldTail = taggerList.tail;
        taggerList.tail = dominatingTagger;


        var partialHandlerList = makeLinkedList();
        prerender(b, offset, dominatingTagger, taggerList, partialHandlerList);

        // TODO if double ended just go in reverse from tail and don't worry about explicitly cutting stuff.

        while (typeof node !== 'undefined' && node.offset <= lastOffset) {
          node = node.next;
        }

        if (typeof node !== 'undefined') {
          taggerList.tail.next = node;
          taggerList.tail = oldTail;
        }

        // skip through delta elts from both lists an
        return makeChangePatch('redraw', renderData(b, partialHandlerList, offset));
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
        return diff(a.node, b.node, eventOffset, eventNode);

      case 'tagger':
        var nextTagger = eventNode.kidListHd;
        while (nextTagger.offset < eventOffset) {
          nextTagger = newEventNode.next;
        }
        nextTagger.func = b.tagger;
        return diff(a.node, b.node, 0, nextTagger);

      case 'leaf':
        var bTag = b.tag;

        if (a.tag !== bTag) {
          // TODO in theory we could special case this and send over only the
          // relevant handlers instead of the entire eventNode. Is it worth it?
          var handlerList = makeLinkedList();
          prerender(b, offset, dominatingTagger, taggerList, handlerList);
          return makeChangePatch('redraw', renderData(b, handlerList, offset));
        }

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

        return diffChildren(a, b, patch, eventOffset, eventNode);
    }
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
        diff[aKey] = undefined;
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


  // assumes that patch parameter is *not* batch
  function diffChildren(aParent, bParent, patch, eventOffset, eventNode) {
    var aChildren = aParent.children;
    var bChildren = bParent.children;

    var aLen = aChildren.length;
    var bLen = bChildren.length;

    // FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

    // TODO come back to this one. maybe move this below the pairwise diff below
    // Also consider adding aParent's descendantsCount to the eventOffset

    if (aLen > bLen) {
      var removePatch = makeChangePatch('remove-last', aLen - bLen);
      patch = typeof patch !== 'undefined' ?
        makeBatchPatch([patch, removePatch]) :
        removePatch;
    } else if (aLen < bLen) {
      var newChildren = bChildren.slice(aLen);
      for (var i = 0; i < newChildren.length; i++) {
        prerender(newChildren[i]);
      }
      var appendPatch = makeChangePatch('append', renderData(newChildren, eventNode, offset));
      patch = typeof patch !== 'undefined' ?
        makeBatchPatch([patch, appendPatch]) :
        appendPatch;
    }

    // PAIRWISE DIFF EVERYTHING ELSE

    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      var aChild = aChildren[i];
      var childPatch = diff(aChild, bChildren[i], ++eventOffset, eventNode);

      if (typeof childPatch !== 'undefined') {
        childPatch = makeAtPatch(i, childPatch);
        if (typeof patch !== 'undefined') {
          if (patch.ctor !== 'batch') {
            patch = makeBatchPatch([patch, childPatch]);
          } else {
            patch.patches.push(childPatch);
          }
        } else {
          patch = childPatch;
        }
      }

      eventOffset += aChild.descendantsCount || 0;
    }

    return patch;
  }


  ////////////  EVENTS  ////////////


  function makeTaggerNode(func, offset) {
    return {
      func: func,
      offset: offset,
      handlerHead: undefined,
      handlerTail: undefined,
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

  function makeLinkedList() {
    return {
      head: undefined,
      tail: undefined
    };
  }

  function makeHandlerListNode(handlers, offset, callback) {
    return {
      funcs: handlers,
      offset: offset,
      callback: callback,
      next: undefined
    };
  }

  function addHandlers(vNode, offset, dominatingTagger, handlerList) {
    var handlers = vNode.facts[EVENT_KEY];
    if (typeof handlers !== 'undefined') {
      var newHandlerNode = makeHandlerNode(handlers, offset);

      newHandlerNode.parent = eventNode;

      if (typeof dominatingTagger.handlerTail !== 'undefined') {
        dominatingTagger.handlerTail.next = newHandlerNode;
      } else {
        dominatingTagger.handlerHead = newHandlerNode;
      }
      dominatingTagger.handlerTail = newHandlerNode;

      var newHandlerListNode = makeHandlerListNode(handlers, offset, newHandlerNode.callback);

      if (typeof handlerList.tail !== 'undefined') {
        handlerList.tail.next = newHandlerListNode;
      } else {
        handlerList.head = newHandlerListNode;
      }
      handlerList.tail = newHandlerListNode;
    }
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

        // taggerList can never be empty due to root event node
        taggerList.tail.next = newTagger;
        taggerList.tail = newTagger;

        prerender(vNode.node, offset, newTagger, taggerList, handlerList);
        return;

      case 'leaf':
        addHandlers(vNode, offset, dominatingTagger, handlerList);
        return;

      case 'parent':
        addHandlers(vNode, offset, dominatingTagger, handlerList);
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

      var rootEventNode = makeTaggerNode(tagger, 0);
      var taggerList = makeLinkedList();
      taggerList.head = rootEventNode;
      taggerList.tail = rootEventNode;

      var handlerList = makeLinkedList();

      prerender(currNode, 0, rootEventNode, taggerList, handlerList);

      // exposed by JSCore
      initialRender(currNode, handlerList);

      // called by runtime every time model changes
      return function stepper(model) {
        var nextNode = view(model);
        var patches = diff(currNode, nextNode, 0, eventTree);
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
