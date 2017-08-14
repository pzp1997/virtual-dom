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
        var parentTagger = dominatingTagger.parent;
        var handlerNode = dominatingTagger.handlerHead;
        while (typeof handlerNode !== 'undefined') {
          handlerNode.parent = parentTagger;
          handlerNode = handlerNode.next;
        }
        return diff(a.node, b, offset, parentTagger, taggerList);
      } else if (bType === 'tagger') {
        // TODO should be bOffset in line below
        var newTagger = makeTaggerNode(vNode.tagger, offset);

        newTagger.parent = dominatingTagger;

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
        var node = dominatingTagger.next;
        dominatingTagger.next = undefined;

        var oldTail = taggerList.tail;
        taggerList.tail = dominatingTagger;

        var node;
        var next = dominatingTagger.handlerHead;
        while (typeof next !== 'undefined' && next.offset < offset) {
          node = next;
          next = node.next;
        }

        if (typeof next !== 'undefined') {
          if (typeof node !== 'undefined') {
            node.next = undefined;
          } else {
            dominatingTagger.handlerHead = undefined;
          }
          var oldTail = dominatingTagger.handlerTail;
          dominatingTagger.handlerTail = node;
        }

        var partialHandlerList = makeLinkedList();
        prerender(b, offset, dominatingTagger, taggerList, partialHandlerList);

        // TODO if doubly-linked just go in reverse from tail and don't worry about explicitly cutting stuff.

        while (typeof node !== 'undefined' && node.offset <= lastOffset) {
          node = node.next;
        }

        if (typeof node !== 'undefined') {
          taggerList.tail.next = node;
          taggerList.tail = oldTail;
        }

        var lastOffset = offset + (a.descendantsCount || 0);
        var lastBadNode;
        while (typeof next !== 'undefined' && next.offset <= lastOffset) {
          lastBadNode = next;
          next = lastBadNode.next;
        }

        if (typeof next !== 'undefined') {
          dominatingTagger.handlerTail.next = next;
          dominatingTagger.handlerTail = oldTail;
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
        return diff(a.node, b.node, offset, dominatingTagger, taggerList);

      case 'tagger':
        // dominatingTagger.next is guaranteed to exist
        var nextTagger = dominatingTagger.next;
        while (nextTagger.offset < offset) {
          nextTagger = nextTagger.next;
        }
        nextTagger.func = b.tagger;
        return diff(a.node, b.node, offset, nextTagger, taggerList);

      case 'leaf':
        var bTag = b.tag;

        if (a.tag !== bTag) {
          var node;
          var next = dominatingTagger.handlerHead;
          while (typeof next !== 'undefined' && next.offset < offset) {
            node = next;
            next = node.next;
          }

          // if (node and next are both undefined) {
          //   empty handlers, no extra processing needed
          // }
          // if (only node is undefined) {
          //   then all handlers are greater than offset, but not necessarily good
          //   must process next after addHandlers
          // }
          // if (only next is undefined) {
          //   end of handlers, no extra processing needed
          // }
          // if (both are defined) {
          //   we have good and bad and need to splice
          //   and we should process next after addHandlers
          // }

          if (typeof next !== 'undefined') {
            if (typeof node !== 'undefined') {
              node.next = undefined;
            } else {
              dominatingTagger.handlerHead = undefined;
            }
            var oldTail = dominatingTagger.handlerTail;
            dominatingTagger.handlerTail = node;
          }

          var partialHandlerList = makeLinkedList();
          addHandlers(b, offset, dominatingTagger, partialHandlerList);

          var lastOffset = offset + (a.descendantsCount || 0);
          var lastBadNode;
          while (typeof next !== 'undefined' && next.offset <= lastOffset) {
            lastBadNode = next;
            next = lastBadNode.next;
          }

          // if (both next and lastBadNode are undefined) {
          //   impossible case because of initial check. in theory this means
          //   no extra processing needed
          // }
          //
          // if (only next is undefined) {
          //   everything is bad, so do not attach anything
          // }
          //
          // if (only lastBadNode is undefined) {
          //   everything is good, so attach everything
          // }
          //
          // if (both are defined) {
          //   some bad followed by some good. attach next to handlerTail
          // }

          if (typeof next !== 'undefined') {
            dominatingTagger.handlerTail.next = next;
            dominatingTagger.handlerTail = oldTail;
          }

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

        return diffChildren(a, b, patch, offset, dominatingTagger, taggerList);
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
  function diffChildren(aParent, bParent, patch, offset, dominatingTagger, taggerList) {
    var aChildren = aParent.children;
    var bChildren = bParent.children;

    var aLen = aChildren.length;
    var bLen = bChildren.length;

    // PAIRWISE DIFF EVERYTHING ELSE

    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      var aChild = aChildren[i];
      var childPatch = diff(aChild, bChildren[i], ++offset, dominatingTagger, taggerList);

      if (typeof childPatch !== 'undefined') {
        combinePatches(makeAtPatch(i, childPatch), patch);
      }

      offset += aChild.descendantsCount || 0;
    }


    // FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

    // TODO Also consider adding aParent's descendantsCount to the eventOffset

    if (aLen > bLen) {
      var removePatch = makeChangePatch('remove-last', aLen - bLen);
      patch = combinePatches(removePatch, patch);
    } else if (aLen < bLen) {
      var newChildren = bChildren.slice(aLen);
      for (var i = 0; i < newChildren.length; i++) {
        // TODO fix this
        // prerender(vNode, offset, dominatingTagger, taggerList, handlerList)
        var partialHandlerList = makeLinkedList();
        prerender(newChildren[i], bOffset, dominatingTagger, taggerList, partialHandlerList);
      }
      var appendPatch = makeChangePatch('append', renderData(newChildren, eventNode, offset));
      patch = combinePatches(appendPatch, patch);
    }


    return patch;
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

      // TODO maybe rootEventNode's offset should be -1
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
