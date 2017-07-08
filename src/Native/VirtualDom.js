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


  function diff(a, b) {
    var patches = [];
    diffHelp(a, b, patches);
    return patches;
  }


  function makeChangePatch(type, data) {
    return {
      ctor: 'change',
      type: type,
      data: data,
      node: undefined
    };
  }

  function makeAtPatch(index, patches) {
    return {
      ctor: 'at',
      index: index,
      patches: patches
    };
  }


  function diffHelp(a, b, patches) {
    if (a === b) {
      return;
    }

    var bType = b.type;

    // Bail if you run into different types of nodes. Implies that the
    // structure has changed significantly and it's not worth a diff.
    if (a.type !== bType || a.tag !== b.tag) {
      patches.push(makeChangePatch('redraw', b));
      return;
    }

    var factsDiff = diffFacts(a.facts, b.facts);
    if (typeof factsDiff !== 'undefined') {
      patches.push(makeChangePatch('facts', factsDiff));
    }

    // Now we know that both nodes are the same type.
    switch (bType) {
      case 'leaf':
        return;

      case 'node':
        diffChildren(a, b, patches);
        return;
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

      // TODO update for YOGA_KEY
      // remove if not in the new facts
      if (!(aKey in b)) {
        diff = diff || {};
        diff[aKey] =
          (typeof category === 'undefined') ?
          (typeof a[aKey] === 'string' ? '' : null) :
          (category === STYLE_KEY) ?
          '' :
          (category === ATTR_KEY) ?
          undefined : {
            value: undefined
          };

        continue;
      }

      var aValue = a[aKey];
      var bValue = b[aKey];

      // reference equal, so don't worry about it
      if (aValue === bValue && aKey !== 'value') {
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


  function diffChildren(aParent, bParent, patches, rootIndex) {
    var aChildren = aParent.children;
    var bChildren = bParent.children;

    var aLen = aChildren.length;
    var bLen = bChildren.length;

    // FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

    if (aLen > bLen) {
      patches.push(makeChangePatch('remove-last', aLen - bLen));
    } else if (aLen < bLen) {
      patches.push(makeChangePatch('append', bChildren.slice(aLen)));
    }

    // PAIRWISE DIFF EVERYTHING ELSE

    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      var childPatches = [];
      diffHelp(aChildren[i], bChildren[i], childPatches);
      patches.push(makeAtPatch(i, patches));
    }
  }

  // PROGRAMS

  var program = makeProgram(checkNoFlags);
  var programWithFlags = makeProgram(checkYesFlags);

  function makeProgram(flagChecker) {
    return F2(function(debugWrap, impl) {
      return function(flagDecoder) {
        return function(object, moduleName, debugMetadata) {
          var checker = flagChecker(flagDecoder, moduleName);
          if (typeof debugMetadata === 'undefined') {
            normalSetup(impl, object, moduleName, checker);
          } else {
            debugSetup(A2(debugWrap, debugMetadata, impl), object, moduleName, checker);
          }
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

      crash(errorMessage, domNode);
    };
  }

  function checkYesFlags(flagDecoder, moduleName) {
    return function(init, flags, domNode) {
      if (typeof flagDecoder === 'undefined') {
        var errorMessage =
          'Are you trying to sneak a Never value into Elm? Trickster!\n' +
          'It looks like ' + moduleName + '.main is defined with `programWithFlags` but has type `Program Never`.\n' +
          'Use `program` instead if you do not want flags.'

        crash(errorMessage, domNode);
      }

      var result = A2(_elm_lang$core$Native_Json.run, flagDecoder, flags);
      if (result.ctor === 'Ok') {
        return init(result._0);
      }

      var errorMessage =
        'Trying to initialize the `' + moduleName + '` module with an unexpected flag.\n' +
        'I tried to convert it to an Elm value, but ran into this problem:\n\n' +
        result._0;

      crash(errorMessage, domNode);
    };
  }

  function crash(errorMessage, domNode) {
    if (domNode) {
      domNode.innerHTML =
        '<div style="padding-left:1em;">' +
        '<h2 style="font-weight:normal;"><b>Oops!</b> Something went wrong when starting your Elm program.</h2>' +
        '<pre style="padding-left:1em;">' + errorMessage + '</pre>' +
        '</div>';
    }

    throw new Error(errorMessage);
  }


  //  NORMAL SETUP

  function normalSetup(impl, object, moduleName, flagChecker) {
    object['embed'] = function embed(node, flags) {
      while (node.lastChild) {
        node.removeChild(node.lastChild);
      }

      return _elm_lang$core$Native_Platform.initialize(
        flagChecker(impl.init, flags, node),
        impl.update,
        impl.subscriptions,
        normalRenderer(node, impl.view)
      );
    };

    object['fullscreen'] = function fullscreen(flags) {
      return _elm_lang$core$Native_Platform.initialize(
        flagChecker(impl.init, flags, document.body),
        impl.update,
        impl.subscriptions,
        normalRenderer(document.body, impl.view)
      );
    };
  }

  function normalRenderer(parentNode, view) {
    return function(tagger, initialModel) {
      var initialVirtualNode = view(initialModel);
      var domNode = initialRender(initialVirtualNode);
      parentNode.appendChild(domNode);
      return makeStepper(domNode, view, initialVirtualNode);
    };
  }


  // STEPPER

  var rAF =
    typeof requestAnimationFrame !== 'undefined' ?
    requestAnimationFrame :
    function(callback) {
      setTimeout(callback, 1000 / 60);
    };

  function `makeStepper` (domNode, view, initialVirtualNode) {
    var state = 'NO_REQUEST';
    var currNode = initialVirtualNode;
    var nextModel;

    function updateIfNeeded() {
      switch (state) {
        case 'NO_REQUEST':
          throw new Error(
            'Unexpected draw callback.\n' +
            'Please report this to <https://github.com/elm-lang/virtual-dom/issues>.'
          );

        case 'PENDING_REQUEST':
          rAF(updateIfNeeded);
          state = 'EXTRA_REQUEST';

          var nextNode = view(nextModel);
          var patches = diff(currNode, nextNode);
          domNode = applyPatches(domNode, currNode, patches);
          currNode = nextNode;

          return;

        case 'EXTRA_REQUEST':
          state = 'NO_REQUEST';
          return;
      }
    }

    return function stepper(model) {
      if (state === 'NO_REQUEST') {
        rAF(updateIfNeeded);
      }
      state = 'PENDING_REQUEST';
      nextModel = model;
    };
  }

  return {
    node: node,
    leaf: leaf,

    property: F2(property),
    yogaProperty: F2(yogaProperty)

    program: program,
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
