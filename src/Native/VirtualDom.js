var _elm_lang$virtual_dom$VirtualDom_Debug$wrap;
var _elm_lang$virtual_dom$VirtualDom_Debug$wrapWithFlags;

var _elm_lang$virtual_dom$Native_VirtualDom = function() {

  var STYLE_KEY = 'STYLE';
  var ATTR_KEY = 'ATTR';

  var localDoc = typeof document !== 'undefined' ? document : {};


  ////////////  VIRTUAL DOM NODES  ////////////


  function text(string) {
    return {
      type: 'text',
      text: string
    };
  }


  function node(tag) {
    return F2(function(factList, kidList) {
      return nodeHelp(tag, factList, kidList);
    });
  }


  function nodeHelp(tag, factList, kidList) {
    var organized = organizeFacts(factList);
    var facts = organized.facts;

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
      type: 'node',
      tag: tag,
      facts: facts,
      children: children,
      descendantsCount: descendantsCount
    };
  }


  function custom(factList, model, impl) {
    var facts = organizeFacts(factList).facts;

    return {
      type: 'custom',
      facts: facts,
      model: model,
      impl: impl
    };
  }


  function map(tagger, node) {
    return {
      type: 'tagger',
      tagger: tagger,
      node: node,
      descendantsCount: 1 + (node.descendantsCount || 0)
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
    var namespace, facts = {};

    while (factList.ctor !== '[]') {
      var entry = factList._0;
      var key = entry.key;

      if (key === ATTR_KEY) {
        var subFacts = facts[key] || {};
        subFacts[entry.realKey] = entry.value;
        facts[key] = subFacts;
      } else if (key === STYLE_KEY) {
        var styles = facts[key] || {};
        var styleList = entry.value;
        while (styleList.ctor !== '[]') {
          var style = styleList._0;
          styles[style._0] = style._1;
          styleList = styleList._1;
        }
        facts[key] = styles;
      } else if (key === 'className') {
        var classes = facts[key];
        facts[key] = typeof classes === 'undefined' ?
          entry.value :
          classes + ' ' + entry.value;
      } else {
        facts[key] = entry.value;
      }
      factList = factList._1;
    }

    return {
      facts: facts
    };
  }



  ////////////  PROPERTIES AND ATTRIBUTES  ////////////


  function style(value) {
    return {
      key: STYLE_KEY,
      value: value
    };
  }


  function property(key, value) {
    return {
      key: key,
      value: value
    };
  }


  function attribute(key, value) {
    return {
      key: ATTR_KEY,
      realKey: key,
      value: value
    };
  }


  ////////////  RENDER  ////////////


  function render(vNode, eventNode) {
    switch (vNode.type) {
      case 'thunk':
        if (!vNode.node) {
          vNode.node = vNode.thunk();
        }
        return render(vNode.node, eventNode);

      case 'tagger':
        var subNode = vNode.node;
        var tagger = vNode.tagger;

        while (subNode.type === 'tagger') {
          typeof tagger !== 'object' ?
            tagger = [tagger, subNode.tagger] :
            tagger.push(subNode.tagger);

          subNode = subNode.node;
        }

        var subEventRoot = {
          tagger: tagger,
          parent: eventNode
        };
        var domNode = render(subNode, subEventRoot);
        domNode.elm_event_node_ref = subEventRoot;
        return domNode;

      case 'text':
        return localDoc.createTextNode(vNode.text);

      case 'node':
        var domNode = localDoc.createElement(vNode.tag);

        applyFacts(domNode, eventNode, vNode.facts);

        var children = vNode.children;

        for (var i = 0; i < children.length; i++) {
          domNode.appendChild(render(children[i], eventNode));
        }

        return domNode;

      case 'custom':
        var domNode = vNode.impl.render(vNode.model);
        applyFacts(domNode, eventNode, vNode.facts);
        return domNode;
    }
  }


  ////////////  APPLY FACTS  ////////////


  function applyFacts(domNode, eventNode, facts) {
    for (var key in facts) {
      var value = facts[key];

      switch (key) {
        case STYLE_KEY:
          applyStyles(domNode, value);
          break;

        case ATTR_KEY:
          applyAttrs(domNode, value);
          break;

        case 'value':
          if (domNode[key] !== value) {
            domNode[key] = value;
          }
          break;

        default:
          domNode[key] = value;
          break;
      }
    }
  }


  function applyStyles(domNode, styles) {
    var domNodeStyle = domNode.style;

    for (var key in styles) {
      domNodeStyle[key] = styles[key];
    }
  }


  function applyAttrs(domNode, attrs) {
    for (var key in attrs) {
      var value = attrs[key];
      if (typeof value === 'undefined') {
        domNode.removeAttribute(key);
      } else {
        domNode.setAttribute(key, value);
      }
    }
  }


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
      domNode: undefined,
      eventNode: undefined
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
        var subPatches = [];
        diffHelp(a.node, b.node, subPatches, 0);
        if (subPatches.length > 0) {
          patches.push(makePatch('p-thunk', index, subPatches));
        }
        return;

      case 'tagger':
        // gather nested taggers
        var aTaggers = a.tagger;
        var bTaggers = b.tagger;
        var nesting = false;

        var aSubNode = a.node;
        while (aSubNode.type === 'tagger') {
          nesting = true;

          typeof aTaggers !== 'object' ?
            aTaggers = [aTaggers, aSubNode.tagger] :
            aTaggers.push(aSubNode.tagger);

          aSubNode = aSubNode.node;
        }

        var bSubNode = b.node;
        while (bSubNode.type === 'tagger') {
          nesting = true;

          typeof bTaggers !== 'object' ?
            bTaggers = [bTaggers, bSubNode.tagger] :
            bTaggers.push(bSubNode.tagger);

          bSubNode = bSubNode.node;
        }

        // Just bail if different numbers of taggers. This implies the
        // structure of the virtual DOM has changed.
        if (nesting && aTaggers.length !== bTaggers.length) {
          patches.push(makePatch('p-redraw', index, b));
          return;
        }

        // check if taggers are "the same"
        if (nesting ? !pairwiseRefEqual(aTaggers, bTaggers) : aTaggers !== bTaggers) {
          patches.push(makePatch('p-tagger', index, bTaggers));
        }

        // diff everything below the taggers
        diffHelp(aSubNode, bSubNode, patches, index + 1);
        return;

      case 'text':
        if (a.text !== b.text) {
          patches.push(makePatch('p-text', index, b.text));
          return;
        }

        return;

      case 'node':
        // Bail if obvious indicators have changed. Implies more serious
        // structural changes such that it's not worth it to diff.
        // if (a.tag !== b.tag || a.namespace !== b.namespace) {
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

      case 'custom':
        if (a.impl !== b.impl) {
          patches.push(makePatch('p-redraw', index, b));
          return;
        }

        var factsDiff = diffFacts(a.facts, b.facts);
        if (typeof factsDiff !== 'undefined') {
          patches.push(makePatch('p-facts', index, factsDiff));
        }

        var patch = b.impl.diff(a, b);
        if (patch) {
          patches.push(makePatch('p-custom', index, patch));
          return;
        }

        return;
    }
  }


  // assumes the incoming arrays are the same length
  function pairwiseRefEqual(as, bs) {
    for (var i = 0; i < as.length; i++) {
      if (as[i] !== bs[i]) {
        return false;
      }
    }

    return true;
  }


  // TODO Instead of creating a new diff object, it's possible to just test if
  // there *is* a diff. During the actual patch, do the diff again and make the
  // modifications directly. This way, there's no new allocations. Worth it?
  function diffFacts(a, b, category) {
    var diff;

    // look for changes and removals
    for (var aKey in a) {
      if (aKey === STYLE_KEY || aKey === ATTR_KEY) {
        var subDiff = diffFacts(a[aKey], b[aKey] || {}, aKey);
        if (subDiff) {
          diff = diff || {};
          diff[aKey] = subDiff;
        }
        continue;
      }

      // remove if not in the new facts
      if (!(aKey in b)) {
        diff = diff || {};
        diff[aKey] =
          (typeof category === 'undefined') ?
          (typeof a[aKey] === 'string' ? '' : null) :
          (category === STYLE_KEY) ?
          '' :
          (category === ATTR_KEY) ?
          undefined :
          {
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


  function addDomNodes(domNode, vNode, patches, eventNode) {
    addDomNodesHelp(domNode, vNode, patches, 0, 0, vNode.descendantsCount, eventNode);
  }


  // assumes `patches` is non-empty and indexes increase monotonically.
  function addDomNodesHelp(domNode, vNode, patches, i, low, high, eventNode) {
    var patch = patches[i];
    var index = patch.index;

    while (index === low) {
      var patchType = patch.type;

      if (patchType === 'p-thunk') {
        addDomNodes(domNode, vNode.node, patch.data, eventNode);
      } else if (patchType === 'p-reorder') {
        patch.domNode = domNode;
        patch.eventNode = eventNode;

        var subPatches = patch.data.patches;
        if (subPatches.length > 0) {
          addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
        }
      } else if (patchType === 'p-remove') {
        patch.domNode = domNode;
        patch.eventNode = eventNode;

        var data = patch.data;
        if (typeof data !== 'undefined') {
          data.entry.data = domNode;
          var subPatches = data.patches;
          if (subPatches.length > 0) {
            addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
          }
        }
      } else {
        patch.domNode = domNode;
        patch.eventNode = eventNode;
      }

      i++;

      if (!(patch = patches[i]) || (index = patch.index) > high) {
        return i;
      }
    }

    switch (vNode.type) {
      case 'tagger':
        var subNode = vNode.node;

        while (subNode.type === "tagger") {
          subNode = subNode.node;
        }

        return addDomNodesHelp(domNode, subNode, patches, i, low + 1, high, domNode.elm_event_node_ref);

      case 'node':
        var vChildren = vNode.children;
        var childNodes = domNode.childNodes;
        for (var j = 0; j < vChildren.length; j++) {
          low++;
          var vChild = vChildren[j];
          var nextLow = low + (vChild.descendantsCount || 0);
          if (low <= index && index <= nextLow) {
            i = addDomNodesHelp(childNodes[j], vChild, patches, i, low, nextLow, eventNode);
            if (!(patch = patches[i]) || (index = patch.index) > high) {
              return i;
            }
          }
          low = nextLow;
        }
        return i;

      case 'text':
      case 'thunk':
        throw new Error('should never traverse `text` or `thunk` nodes like this');
    }
  }



  ////////////  APPLY PATCHES  ////////////


  function applyPatches(rootDomNode, oldVirtualNode, patches, eventNode) {
    if (patches.length === 0) {
      return rootDomNode;
    }

    addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
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
        return applyPatchRedraw(domNode, patch.data, patch.eventNode);

      case 'p-facts':
        applyFacts(domNode, patch.eventNode, patch.data);
        return domNode;

      case 'p-text':
        domNode.replaceData(0, domNode.length, patch.data);
        return domNode;

      case 'p-thunk':
        return applyPatchesHelp(domNode, patch.data);

      case 'p-tagger':
        if (typeof domNode.elm_event_node_ref !== 'undefined') {
          domNode.elm_event_node_ref.tagger = patch.data;
        } else {
          domNode.elm_event_node_ref = {
            tagger: patch.data,
            parent: patch.eventNode
          };
        }
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
          domNode.appendChild(render(newNodes[i], patch.eventNode));
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

      case 'p-custom':
        var impl = patch.data;
        return impl.applyPatch(domNode, impl.data);

      default:
        throw new Error('Ran into an unknown patch!');
    }
  }


  function applyPatchRedraw(domNode, vNode, eventNode) {
    var parentNode = domNode.parentNode;
    var newNode = render(vNode, eventNode);

    if (typeof newNode.elm_event_node_ref === 'undefined') {
      newNode.elm_event_node_ref = domNode.elm_event_node_ref;
    }

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
        render(entry.vnode, patch.eventNode);
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
        render(entry.vnode, patch.eventNode)
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
      var eventNode = {
        tagger: tagger,
        parent: undefined
      };
      var initialVirtualNode = view(initialModel);
      var domNode = render(initialVirtualNode, eventNode);
      parentNode.appendChild(domNode);
      return makeStepper(domNode, view, initialVirtualNode, eventNode);
    };
  }


  // STEPPER

  var rAF =
    typeof requestAnimationFrame !== 'undefined' ?
    requestAnimationFrame :
    function(callback) {
      setTimeout(callback, 1000 / 60);
    };

  function `makeStepper`(domNode, view, initialVirtualNode, eventNode) {
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
          domNode = applyPatches(domNode, currNode, patches, eventNode);
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


  // DEBUG SETUP

  function debugSetup(impl, object, moduleName, flagChecker) {
    object['fullscreen'] = function fullscreen(flags) {
      var popoutRef = {
        doc: undefined
      };
      return _elm_lang$core$Native_Platform.initialize(
        flagChecker(impl.init, flags, document.body),
        impl.update(scrollTask(popoutRef)),
        impl.subscriptions,
        debugRenderer(moduleName, document.body, popoutRef, impl.view, impl.viewIn, impl.viewOut)
      );
    };

    object['embed'] = function fullscreen(node, flags) {
      var popoutRef = {
        doc: undefined
      };
      return _elm_lang$core$Native_Platform.initialize(
        flagChecker(impl.init, flags, node),
        impl.update(scrollTask(popoutRef)),
        impl.subscriptions,
        debugRenderer(moduleName, node, popoutRef, impl.view, impl.viewIn, impl.viewOut)
      );
    };
  }

  function scrollTask(popoutRef) {
    return _elm_lang$core$Native_Scheduler.nativeBinding(function(callback) {
      var doc = popoutRef.doc;
      if (doc) {
        var msgs = doc.getElementsByClassName('debugger-sidebar-messages')[0];
        if (msgs) {
          msgs.scrollTop = msgs.scrollHeight;
        }
      }
      callback(_elm_lang$core$Native_Scheduler.succeed(_elm_lang$core$Native_Utils.Tuple0));
    });
  }


  function debugRenderer(moduleName, parentNode, popoutRef, view, viewIn, viewOut) {
    return function(tagger, initialModel) {
      var appEventNode = {
        tagger: tagger,
        parent: undefined
      };
      var eventNode = {
        tagger: tagger,
        parent: undefined
      };

      // make normal stepper
      var appVirtualNode = view(initialModel);
      var appNode = render(appVirtualNode, appEventNode);
      parentNode.appendChild(appNode);
      var appStepper = makeStepper(appNode, view, appVirtualNode, appEventNode);

      // make overlay stepper
      var overVirtualNode = viewIn(initialModel)._1;
      var overNode = render(overVirtualNode, eventNode);
      parentNode.appendChild(overNode);
      var wrappedViewIn = wrapViewIn(appEventNode, overNode, viewIn);
      var overStepper = makeStepper(overNode, wrappedViewIn, overVirtualNode, eventNode);

      // make debugger stepper
      var debugStepper = makeDebugStepper(initialModel, viewOut, eventNode, parentNode, moduleName, popoutRef);

      return function stepper(model) {
        appStepper(model);
        overStepper(model);
        debugStepper(model);
      }
    };
  }

  function makeDebugStepper(initialModel, view, eventNode, parentNode, moduleName, popoutRef) {
    var curr;
    var domNode;

    return function stepper(model) {
      if (!model.isDebuggerOpen) {
        return;
      }

      if (!popoutRef.doc) {
        curr = view(model);
        domNode = openDebugWindow(moduleName, popoutRef, curr, eventNode);
        return;
      }

      // switch to document of popout
      localDoc = popoutRef.doc;

      var next = view(model);
      var patches = diff(curr, next);
      domNode = applyPatches(domNode, curr, patches, eventNode);
      curr = next;

      // switch back to normal document
      localDoc = document;
    };
  }

  function openDebugWindow(moduleName, popoutRef, virtualNode, eventNode) {
    var w = 900;
    var h = 360;
    var x = screen.width - w;
    var y = screen.height - h;
    var debugWindow = window.open('', '', 'width=' + w + ',height=' + h + ',left=' + x + ',top=' + y);

    // switch to window document
    localDoc = debugWindow.document;

    popoutRef.doc = localDoc;
    localDoc.title = 'Debugger - ' + moduleName;
    localDoc.body.style.margin = '0';
    localDoc.body.style.padding = '0';
    var domNode = render(virtualNode, eventNode);
    localDoc.body.appendChild(domNode);

    localDoc.addEventListener('keydown', function(event) {
      if (event.metaKey && event.which === 82) {
        window.location.reload();
      }
      if (event.which === 38) {
        eventNode.tagger({
          ctor: 'Up'
        });
        event.preventDefault();
      }
      if (event.which === 40) {
        eventNode.tagger({
          ctor: 'Down'
        });
        event.preventDefault();
      }
    });

    function close() {
      popoutRef.doc = undefined;
      debugWindow.close();
    }
    window.addEventListener('unload', close);
    debugWindow.addEventListener('unload', function() {
      popoutRef.doc = undefined;
      window.removeEventListener('unload', close);
      eventNode.tagger({
        ctor: 'Close'
      });
    });

    // switch back to the normal document
    localDoc = document;

    return domNode;
  }


  // BLOCK EVENTS

  function wrapViewIn(appEventNode, overlayNode, viewIn) {
    var ignorer = makeIgnorer(overlayNode);
    var blocking = 'Normal';
    var overflow;

    var normalTagger = appEventNode.tagger;
    var blockTagger = function() {};

    return function(model) {
      var tuple = viewIn(model);
      var newBlocking = tuple._0.ctor;
      appEventNode.tagger = newBlocking === 'Normal' ? normalTagger : blockTagger;
      if (blocking !== newBlocking) {
        traverse('removeEventListener', ignorer, blocking);
        traverse('addEventListener', ignorer, newBlocking);

        if (blocking === 'Normal') {
          overflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
        }

        if (newBlocking === 'Normal') {
          document.body.style.overflow = overflow;
        }

        blocking = newBlocking;
      }
      return tuple._1;
    }
  }

  function traverse(verbEventListener, ignorer, blocking) {
    switch (blocking) {
      case 'Normal':
        return;

      case 'Pause':
        return traverseHelp(verbEventListener, ignorer, mostEvents);

      case 'Message':
        return traverseHelp(verbEventListener, ignorer, allEvents);
    }
  }

  function traverseHelp(verbEventListener, handler, eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
      document.body[verbEventListener](eventNames[i], handler, true);
    }
  }

  function makeIgnorer(overlayNode) {
    return function(event) {
      if (event.type === 'keydown' && event.metaKey && event.which === 82) {
        return;
      }

      var isScroll = event.type === 'scroll' || event.type === 'wheel';

      var node = event.target;
      while (node !== null) {
        if (node.className === 'elm-overlay-message-details' && isScroll) {
          return;
        }

        if (node === overlayNode && !isScroll) {
          return;
        }
        node = node.parentNode;
      }

      event.stopPropagation();
      event.preventDefault();
    }
  }

  var mostEvents = [
    'click', 'dblclick', 'mousemove',
    'mouseup', 'mousedown', 'mouseenter', 'mouseleave',
    'touchstart', 'touchend', 'touchcancel', 'touchmove',
    'pointerdown', 'pointerup', 'pointerover', 'pointerout',
    'pointerenter', 'pointerleave', 'pointermove', 'pointercancel',
    'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop',
    'keyup', 'keydown', 'keypress',
    'input', 'change',
    'focus', 'blur'
  ];

  var allEvents = mostEvents.concat('wheel', 'scroll');


  return {
    node: node,
    text: text,
    custom: custom,
    map: F2(map),

    style: style,
    property: F2(property),
    attribute: F2(attribute),
    mapProperty: F2(mapProperty),

    lazy: F2(lazy),
    lazy2: F3(lazy2),
    lazy3: F4(lazy3),

    program: program,
    programWithFlags: programWithFlags,
    staticProgram: staticProgram
  };

}();
