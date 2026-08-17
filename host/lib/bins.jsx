// ExtendScript target — ES3-only syntax.
//
// Bin/clip nodes are identified to the panel purely by ProjectItem.nodeId
// (a stable string handle) since live objects can't cross the evalScript
// boundary. "Bin-like" is decided by duck-typing (item.children truthy)
// rather than ProjectItem.type constants, which aren't reliable across
// Premiere versions.
//
// The user picks which bin to pull footage from (panel lists every bin in
// the project; a bin named "Content" is just pre-selected by default if
// found — nothing is hard-locked to it).

function isBinLike(item) {
  return !!item.children;
}

// Caption/subtitle/text sidecars that Premiere happily imports as project
// items but that carry no picture — if one sits in the source bin it must
// NOT be treated as footage (it would be "chosen" for random placement and
// also inflate the bin's clip count). Matched by file extension on both the
// media path and the item name, since a caption item may expose neither
// reliably across versions.
var AP_NON_MEDIA_EXTS = [
  ".srt", ".vtt", ".ass", ".ssa", ".scc", ".mcc",
  ".stl", ".sbv", ".sub", ".itt", ".txt", ".csv", ".xml"
];

function endsWithCI(str, suffix) {
  if (str.length < suffix.length) return false;
  return str.substring(str.length - suffix.length).toLowerCase() === suffix;
}

function isNonMediaSidecar(item) {
  var candidates = [];
  try {
    var p = item.getMediaPath && item.getMediaPath();
    if (p) candidates.push(String(p));
  } catch (e) {}
  if (item.name) candidates.push(String(item.name));

  for (var c = 0; c < candidates.length; c++) {
    var s = candidates[c];
    for (var i = 0; i < AP_NON_MEDIA_EXTS.length; i++) {
      if (endsWithCI(s, AP_NON_MEDIA_EXTS[i])) return true;
    }
  }
  return false;
}

function isUsableClip(item) {
  // Anything that isn't a bin counts as usable source content — including
  // nested sequences placed straight in the bin, which some projects use as
  // pre-built compilations to sample pieces from just like raw footage.
  // Caption/subtitle/text sidecars are the one exception: they have no
  // picture, so they are never valid source footage.
  if (isBinLike(item)) return false;
  if (isNonMediaSidecar(item)) return false;
  return true;
}

function countClipsIn(item, recursive) {
  var count = 0;
  for (var i = 0; i < item.children.numItems; i++) {
    var child = item.children[i];
    if (isBinLike(child)) {
      if (recursive) count += countClipsIn(child, true);
    } else if (isUsableClip(child)) {
      count++;
    }
  }
  return count;
}

function walkBins(item, pathPrefix, out) {
  var path = pathPrefix ? pathPrefix + "/" + item.name : item.name;
  out.push({ id: item.nodeId, name: item.name, path: path, clipCount: countClipsIn(item, true) });

  for (var i = 0; i < item.children.numItems; i++) {
    var child = item.children[i];
    if (isBinLike(child)) walkBins(child, path, out);
  }
}

// The project root is listed too (it can hold loose clips of its own), but
// its own name is never folded into descendants' paths — nobody wants every
// bin in the dropdown prefixed with the project's internal root label.
function collectBins(rootItem) {
  var rootName = rootItem.name || "Root";
  var out = [{ id: rootItem.nodeId, name: rootName, path: rootName, clipCount: countClipsIn(rootItem, true) }];

  for (var i = 0; i < rootItem.children.numItems; i++) {
    var child = rootItem.children[i];
    if (isBinLike(child)) walkBins(child, "", out);
  }
  return out;
}

function findItemByIdRec(item, nodeId) {
  for (var i = 0; i < item.children.numItems; i++) {
    var child = item.children[i];
    if (child.nodeId === nodeId) return child;
    if (isBinLike(child)) {
      var found = findItemByIdRec(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function findItemById(rootItem, nodeId) {
  if (rootItem.nodeId === nodeId) return rootItem;
  return findItemByIdRec(rootItem, nodeId);
}

function collectClips(binItem, recursive) {
  var out = [];
  for (var i = 0; i < binItem.children.numItems; i++) {
    var child = binItem.children[i];
    if (isBinLike(child)) {
      if (recursive) {
        var nested = collectClips(child, true);
        for (var k = 0; k < nested.length; k++) out.push(nested[k]);
      }
    } else if (isUsableClip(child)) {
      out.push(child);
    }
  }
  return out;
}
