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
      node: node
      // descendantsCount is implicitly treated as 0
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


  ////////////  DIFF  ////////////


  function makeChangePatch(type, data, eventNode) {
    return {
      ctor: 'change',
      type: type,
      data: data,
      node: undefined,
      eventNode: undefined
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


  function diff(a, b, eventOffset, eventNode) {
    if (a === b) {
      return;
    }

    var bType = b.type;

    if (a.type !== bType) {
      prerender(b);
      return makeChangePatch('redraw', b, eventNode);
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
        var newEventNode = eventNode.kidListHd;
        while (newEventNode.offset < eventOffset) {
          newEventNode = newEventNode.next;
        }

        // TODO does it even pay to check if they're unequal?
        if (a.tagger !== b.tagger) {
          newEventNode.func = b.tagger;
        }
        return diff(a.node, b.node, 0, newEventNode);

      case 'leaf':
        var bTag = b.tag;

        if (a.tag !== bTag) {
          // TODO in theory we could special case this and send over only the
          // relevant handlers instead of the entire eventNode. Is it worth it?
          return makeChangePatch('redraw', b, eventNode);
        }

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          factsDiff.tag = bTag;
          return makeChangePatch('facts', factsDiff, undefined);
        }
        return;

      case 'parent':
        var patch;

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          factsDiff.tag = 'parent';
          patch = makeChangePatch('facts', factsDiff, undefined);
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

    if (aLen > bLen) {
      var removePatch = makeChangePatch('remove-last', aLen - bLen, undefined);
      patch = typeof patch !== 'undefined' ?
        makeBatchPatch([patch, removePatch]) :
        removePatch;
    } else if (aLen < bLen) {
      var newChildren = bChildren.slice(aLen);
      for (var i = 0; i < newChildren.length; i++) {
        prerender(newChildren[i]);
      }
      var appendPatch = makeChangePatch('append', newChildren, eventNode);
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

  function makeTaggerNode(func, offset) {
    return {
      func: func,
      offset: offset,
      handlerListHd: undefined,
      handlerListTl: undefined,
      kidListHd: undefined,
      kidListTl: undefined,
      parent: undefined,
      next: undefined
    }
  }

  function makeHandlerNode(handlers, offset) {
    var handlerNode = {
      funcs: handlers,
      offset: offset,
      parent: undefined,
      next: undefined
    };

    return handlerNode;
  }

  function addHandlers(vNode, offset, eventNode) {
    var handlers = vNode.facts[EVENT_KEY];
    if (typeof handlers !== 'undefined') {
      var newTail = makeHandlerNode(handlers, offset);
      newTail.parent = eventNode;

      if (typeof eventNode.handlerListTl !== 'undefined') {
        eventNode.handlerListTl.next = newTail;
      } else {
        eventNode.handlerListHd = newTail;
      }
      eventNode.handlerListTl = newTail;
    }
  }

  // TODO a lot of cool stuff is happening here. maybe document it?
  function prerender(vNode, offset, eventNode) {
    switch (vNode.type) {
      case 'thunk':
        if (!vNode.node) {
          vNode.node = vNode.thunk();
          prerender(vNode.node, offset, eventNode);
        }
        return;

      case 'tagger':
        var newEventNode = makeTaggerNode(vNode.tagger, offset);
        prerender(vNode.node, 0, newEventNode);

        newEventNode.parent = eventNode;

        if (typeof eventNode.kidListTl !== 'undefined') {
          eventNode.kidListTl.next = newEventNode;
        } else {
          eventNode.kidListHd = newEventNode;
        }
        eventNode.kidListTl = newEventNode;
        return;

      case 'leaf':
        addHandlers(vNode, offset, eventNode);
        return;

      case 'parent':
        var children = vNode.children;
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          prerender(child, ++offset, eventNode);
          offset += child.descendantsCount || 0;
        }
        addHandlers(vNode, offset, eventNode);
        return;
    }
  }

  function normalRenderer(view) {
    return function(tagger, initialModel) {
      var currNode = view(initialModel);
      var eventTree = makeTaggerNode( /* TODO */ , 0);
      prerender(currNode, 0, eventTree);

      // exposed by JSCore
      initialRender(currNode, eventTree);

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

    property: F2(property),
    yogaProperty: F2(yogaProperty),

    program: program,
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
