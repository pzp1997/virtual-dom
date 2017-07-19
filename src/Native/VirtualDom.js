var _elm_lang$virtual_dom$VirtualDom_Debug$wrap;
var _elm_lang$virtual_dom$VirtualDom_Debug$wrapWithFlags;

var _elm_lang$virtual_dom$Native_VirtualDom = function() {

  var YOGA_KEY = 'YOGA';

  ////////////  VIRTUAL DOM NODES  ////////////

  function leaf(tag) {
    return function(factList) {
      return leafHelp(tag, factList);
    };
  }

  function leafHelp(tag, factList) {
    var facts = organizeFacts(factList);

    return {
      type: 'leaf',
      tag: tag,
      facts: facts
    }
  }

  function parent(tag) {
    return F2(function(factList, kidList) {
      return parentHelp(tag, factList, kidList);
    });
  }

  function parentHelp(tag, factList, kidList) {
    var facts = organizeFacts(factList);

    return {
      type: 'parent',
      tag: tag,
      facts: facts,
      children: _elm_lang$core$Native_List.toArray(kidList)
    };
  }


  // FACTS


  function organizeFacts(factList) {
    var facts = {};

    while (factList.ctor !== '[]') {
      var entry = factList._0;
      var key = entry.key;

      if (key == YOGA_KEY) {
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


  function diff(a, b) {
    if (a === b) {
      return;
    }

    var bType = b.type;

    if (a.type !== bType) {
      return makeChangePatch('redraw', b);
    }

    var bTag = b.tag;

    if (a.tag !== bTag) {
      return makeChangePatch('redraw', b);
    }

    var patch;

    // TODO maybe combine tag and facts
    var factsDiff = diffFacts(a.facts, b.facts);
    if (typeof factsDiff !== 'undefined') {
      factsDiff.tag = bTag;
      patch = makeChangePatch('facts', factsDiff);
    }

    // Now we know that both nodes are the same type.
    switch (bType) {
      case 'leaf':
        return patch;

      case 'node':
        return diffChildren(a, b, patch);
    }
  }


  function diffFacts(a, b, category) {
    var diff;

    // look for changes and removals
    for (var aKey in a) {
      if (aKey === YOGA_KEY) {
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
  function diffChildren(aParent, bParent, patch) {
    var aChildren = aParent.children;
    var bChildren = bParent.children;

    var aLen = aChildren.length;
    var bLen = bChildren.length;

    // FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

    if (aLen > bLen) {
      var removePatch = makeChangePatch('remove-last', aLen - bLen);
      patch = typeof patch !== 'undefined'
        ? makeBatchPatch([patch, removePatch])
        : removePatch;
    } else if (aLen < bLen) {
      var appendPatch = makeChangePatch('append', bChildren.slice(aLen));
      patch = typeof patch !== 'undefined'
        ? makeBatchPatch([patch, appendPatch])
        : appendPatch;
    }

    // PAIRWISE DIFF EVERYTHING ELSE

    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      var childPatch = diffHelp(aChildren[i], bChildren[i]);
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

  function normalRenderer(view) {
    return function(tagger, initialModel) {
      var currNode = view(initialModel);

      // exposed by JSCore
      initialRender(currNode);

      // called by runtime every time model changes
      return function stepper(model) {
        var nextNode = view(model);
        var patches = diff(currNode, nextNode);
        if (typeof patches !== 'undefined') {
          // exposed by JSCore
          applyPatches(patches);
        }
        currNode = nextNode;
      };
    };
  }

  return {
    parent: parent,
    leaf: leaf,

    property: F2(property),
    yogaProperty: F2(yogaProperty),

    program: program,
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
