var _elm_lang$virtual_dom$VirtualDom_Debug$wrap;
var _elm_lang$virtual_dom$VirtualDom_Debug$wrapWithFlags;

var _elm_lang$virtual_dom$Native_VirtualDom = function() {

  var localDoc = typeof document !== 'undefined' ? document : {};

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
      tag: tag,
      facts: facts,
      children: children,
      descendantsCount: descendantsCount
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


  ////////////  PROPERTIES AND ATTRIBUTES  ////////////


  function property(key, value) {
    return {
      key: key,
      value: value
    };
  }

  function yogaProp(key, value) {
    return {
      key: YOGA_KEY,
      realKey: key,
      value: value
    }
  }


  ////////////  RENDER  ////////////


  function render(vNode) {
    renderView(vNode); // TODO implementation provided by JSC. Make sure to iterate through children
  }


  ////////////  APPLY FACTS  ////////////

  // TODO write this stuff in Obj-C

  function applyFacts(domNode, facts) {
    for (var key in facts) {
      domNode[key] = facts[key];
    }
  }

  // TODO consider using null to remove properties.


  ////////////  DIFF  ////////////


  function diff(a, b) {
    var patches = [];
    diffHelp(a, b, patches, 0);
    return patches;
  }


  function makePatch(type, index, data) {
    return {
      index: index,
      type: type,
      data: data,
      domNode: undefined
    };
  }


  function diffHelp(a, b, patches, index) {
    if (a === b) {
      return;
    }

    var aType = a.type;
    var bType = b.type;

    // Bail if you run into different types of nodes. Implies that the
    // structure has changed significantly and it's not worth a diff.
    if (aType !== bType) {
      patches.push(makePatch('p-redraw', index, b));
      return;
    }

    // Now we know that both nodes are the same type.
    switch (bType) {
      case 'leaf':
        if (a.tag !== b.tag) {
          patches.push(makePatch('p-redraw', index, b));
          return;
        }

        var factsDiff = diffFacts(a.facts, b.facts);

        if (typeof factsDiff !== 'undefined') {
          patches.push(makePatch('p-facts', index, factsDiff));
        }

        return;

      case 'node':
        // Bail if obvious indicators have changed. Implies more serious
        // structural changes such that it's not worth it to diff.
        if (a.tag !== b.tag) {
          patches.push(makePatch('p-redraw', index, b));
          return;
        }

        var factsDiff = diffFacts(a.facts, b.facts);

        if (typeof factsDiff !== 'undefined') {
          patches.push(makePatch('p-facts', index, factsDiff));
        }

        diffChildren(a, b, patches, index);
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
      patches.push(makePatch('p-remove-last', rootIndex, aLen - bLen));
    } else if (aLen < bLen) {
      patches.push(makePatch('p-append', rootIndex, bChildren.slice(aLen)));
    }

    // PAIRWISE DIFF EVERYTHING ELSE

    var index = rootIndex;
    var minLen = aLen < bLen ? aLen : bLen;
    for (var i = 0; i < minLen; i++) {
      index++;
      var aChild = aChildren[i];
      diffHelp(aChild, bChildren[i], patches, index);
      index += aChild.descendantsCount || 0;
    }
  }


  ////////////  ADD DOM NODES  ////////////
  //
  // Each DOM node has an "index" assigned in order of traversal. It is important
  // to minimize our crawl over the actual DOM, so these indexes (along with the
  // descendantsCount of virtual nodes) let us skip touching entire subtrees of
  // the DOM if we know there are no patches there.


  function addDomNodes(domNode, vNode, patches) {
    addDomNodesHelp(domNode, vNode, patches, 0, 0, vNode.descendantsCount);
  }


  // assumes `patches` is non-empty and indexes increase monotonically.
  function addDomNodesHelp(domNode, vNode, patches, i, low, high) {
    var patch = patches[i];
    var index = patch.index;

    while (index === low) {
      var patchType = patch.type;

      if (patchType === 'p-reorder') {
        patch.domNode = domNode;

        var subPatches = patch.data.patches;
        if (subPatches.length > 0) {
          addDomNodesHelp(domNode, vNode, subPatches, 0, low, high);
        }
      } else if (patchType === 'p-remove') {
        patch.domNode = domNode;

        var data = patch.data;
        if (typeof data !== 'undefined') {
          data.entry.data = domNode;
          var subPatches = data.patches;
          if (subPatches.length > 0) {
            addDomNodesHelp(domNode, vNode, subPatches, 0, low, high);
          }
        }
      } else {
        patch.domNode = domNode;
      }

      i++;

      if (!(patch = patches[i]) || (index = patch.index) > high) {
        return i;
      }
    }

    switch (vNode.type) {
      case 'parent':
        var vChildren = vNode.children;
        var childNodes = domNode.childNodes;
        for (var j = 0; j < vChildren.length; j++) {
          low++;
          var vChild = vChildren[j];
          var nextLow = low + (vChild.descendantsCount || 0);
          if (low <= index && index <= nextLow) {
            i = addDomNodesHelp(childNodes[j], vChild, patches, i, low, nextLow);
            if (!(patch = patches[i]) || (index = patch.index) > high) {
              return i;
            }
          }
          low = nextLow;
        }
        return i;

      case 'leaf':
        throw new Error('should never traverse `leaf` nodes like this');
    }
  }



  ////////////  APPLY PATCHES  ////////////


  function applyPatches(rootDomNode, oldVirtualNode, patches) {
    if (patches.length === 0) {
      return rootDomNode;
    }

    addDomNodes(rootDomNode, oldVirtualNode, patches);
    return applyPatchesHelp(rootDomNode, patches);
  }

  function applyPatchesHelp(rootDomNode, patches) {
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      var localDomNode = patch.domNode
      var newNode = applyPatch(localDomNode, patch);
      if (localDomNode === rootDomNode) {
        rootDomNode = newNode;
      }
    }
    return rootDomNode;
  }

  function applyPatch(domNode, patch) {
    switch (patch.type) {
      case 'p-redraw':
        return applyPatchRedraw(domNode, patch.data);

      case 'p-facts':
        applyFacts(domNode, patch.data);
        return domNode;

      case 'p-text':
        domNode.replaceData(0, domNode.length, patch.data);
        return domNode;

      case 'p-remove-last':
        var i = patch.data;
        while (i--) {
          domNode.removeChild(domNode.lastChild);
        }
        return domNode;

      case 'p-append':
        var newNodes = patch.data;
        for (var i = 0; i < newNodes.length; i++) {
          domNode.appendChild(render(newNodes[i]));
        }
        return domNode;

      case 'p-remove':
        var data = patch.data;
        if (typeof data === 'undefined') {
          domNode.parentNode.removeChild(domNode);
          return domNode;
        }
        var entry = data.entry;
        if (typeof entry.index !== 'undefined') {
          domNode.parentNode.removeChild(domNode);
        }
        entry.data = applyPatchesHelp(domNode, data.patches);
        return domNode;

      case 'p-reorder':
        return applyPatchReorder(domNode, patch);

      default:
        throw new Error('Ran into an unknown patch!');
    }
  }


  function applyPatchRedraw(domNode, vNode) {
    var parentNode = domNode.parentNode;
    var newNode = render(vNode);

    if (parentNode && newNode !== domNode) {
      parentNode.replaceChild(newNode, domNode);
    }
    return newNode;
  }


  function applyPatchReorder(domNode, patch) {
    var data = patch.data;

    // remove end inserts
    var frag = applyPatchReorderEndInsertsHelp(data.endInserts, patch);

    // removals
    domNode = applyPatchesHelp(domNode, data.patches);

    // inserts
    var inserts = data.inserts;
    for (var i = 0; i < inserts.length; i++) {
      var insert = inserts[i];
      var entry = insert.entry;
      var node = entry.tag === 'move' ?
        entry.data :
        render(entry.vnode);
      domNode.insertBefore(node, domNode.childNodes[insert.index]);
    }

    // add end inserts
    if (typeof frag !== 'undefined') {
      domNode.appendChild(frag);
    }

    return domNode;
  }


  function applyPatchReorderEndInsertsHelp(endInserts, patch) {
    if (typeof endInserts === 'undefined') {
      return;
    }

    var frag = localDoc.createDocumentFragment();
    for (var i = 0; i < endInserts.length; i++) {
      var insert = endInserts[i];
      var entry = insert.entry;
      frag.appendChild(entry.tag === 'move' ?
        entry.data :
        render(entry.vnode)
      );
    }
    return frag;
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
      var domNode = render(initialVirtualNode);
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
    yogaProp: F2(yogaProp)

    program: program,
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
