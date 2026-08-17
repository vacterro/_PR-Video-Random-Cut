// ExtendScript entry point — loaded once when the panel opens (CEP ScriptPath).
// Everything below stays in global scope on purpose: evalScript() calls
// AP_getProjectInfo() / AP_runStart() / AP_runStep() / AP_runCancel() by name
// from the panel afterwards.

#include "lib/json2.jsx"
#include "lib/util.jsx"
#include "lib/bins.jsx"
#include "lib/qe.jsx"
#include "lib/placement.jsx"
#include "lib/narrator.jsx"
#include "lib/srt.jsx"
#include "lib/selected.jsx"

// Globally stored MOGRT clip references set during importMGT in narrator.
// Consumed by AP_processPendingMogrts to avoid fragile time-based clip search.
var AP_PENDING_MGT_CLIPS = [];

function AP_getProjectInfo() {
  try {
    var proj = app.project;
    if (!proj) return JSON.stringify({ ok: false, error: "No project open." });

    var hasSeq = !!proj.activeSequence;
    var bins = collectBins(proj.rootItem);
    var videoTracks = hasSeq ? listVideoTracks(proj.activeSequence) : [];
    var audioTracks = hasSeq ? listAudioTracks(proj.activeSequence) : [];

    return JSON.stringify({
      ok: true,
      hasActiveSequence: hasSeq,
      sequenceName: hasSeq ? proj.activeSequence.name : "",
      bins: bins,
      videoTracks: videoTracks,
      audioTracks: audioTracks
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}

// Lists the individual usable clips inside a bin (video-only, same filter as
// the randomizer) so the panel can offer "fill narrator gaps from THIS one
// clip" instead of picking randomly across the whole bin.
function AP_getBinClips(paramsJsonString) {
  try {
    var params = JSON.parse(paramsJsonString);
    var proj = app.project;
    if (!proj) throw new Error("No project open.");

    var binItem = findItemById(proj.rootItem, params.binId);
    if (!binItem) return JSON.stringify({ ok: true, clips: [] });

    var items = collectClips(binItem, !!params.recursive);
    var out = [];
    for (var i = 0; i < items.length; i++) {
      out.push({ id: items[i].nodeId, name: items[i].name });
    }
    return JSON.stringify({ ok: true, clips: out });
  } catch (e) {
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}

// Run lifecycle is a single synchronous call so that app.beginUndoGroup()
// correctly wraps all placements into a single Ctrl+Z action.
// Premiere Pro auto-closes Undo groups across evalScript boundaries, 
// so batching asynchronously breaks Undo.

function AP_runAll(paramsJsonString) {
  try {
    var params = JSON.parse(paramsJsonString);

    var proj = app.project;
    if (!proj) throw new Error("No project open.");

    var seq = proj.activeSequence;
    if (!seq) throw new Error("No active sequence. Open a sequence and click Refresh.");

    var binItem = findItemById(proj.rootItem, params.bin.id);
    if (!binItem) throw new Error("Chosen bin no longer exists in the project — click Refresh.");

    var clips = collectClips(binItem, !!params.bin.recursive);
    if (clips.length === 0) throw new Error("That bin has no usable clips" + (params.bin.recursive ? "" : " (try enabling 'Include sub-bins')") + ".");

    try { app.beginUndoGroup("_PR Video Random Cut"); } catch (eUndo) {}
    apStartEngine(seq, clips, params);
    
    while (!AP_ENGINE.done) {
      apStepEngine(500);
    }
    
    var result = apFinishEngine();
    try { app.endUndoGroup(); } catch (eUndo) {}
    
    result.ok = true;
    result.done = true;
    return JSON.stringify(result);
  } catch (e) {
    try { app.endUndoGroup(); } catch (eUndo) {}
    if (typeof AP_ENGINE !== "undefined") {
      AP_ENGINE = null;
    }
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}

function AP_replaceSelected(paramsJsonString) {
  try {
    var params = JSON.parse(paramsJsonString);

    var proj = app.project;
    if (!proj) throw new Error("No project open.");

    var seq = proj.activeSequence;
    if (!seq) throw new Error("No active sequence.");

    var binItem = findItemById(proj.rootItem, params.bin.id);
    if (!binItem) throw new Error("Chosen bin no longer exists — click Refresh.");

    var clips = collectClips(binItem, !!params.bin.recursive);
    if (clips.length === 0) throw new Error("That bin has no usable clips.");

    try { app.beginUndoGroup("_PR Video Random Cut Replace Selected"); } catch (eUndo) {}

    var result = apReplaceSelectedLogic(seq, clips, params);

    try { app.endUndoGroup(); } catch (eUndo2) {}

    return JSON.stringify({
      ok: true,
      logTail: result.log,
      summary: result.summary,
      pendingMogrts: result.pendingMogrts
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (eUndo3) {}
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}

function AP_processPendingMogrts(paramsJsonString) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return JSON.stringify({ ok: true }); // sequence closed?
    
    try { app.beginUndoGroup("_PR Video Random Cut Subtitles"); } catch(e) {}
    
    var log = [];
    
    // Use globally stored clip refs (set during importMGT) to avoid fragile
    // time-based search — Premiere may have placed the clip at a slightly
    // different offset or the track may have multiple clips at similar times.
    var clipsToProcess = AP_PENDING_MGT_CLIPS.slice(0);
    AP_PENDING_MGT_CLIPS = [];
    var stillPending = [];
    
    for (var m = 0; m < clipsToProcess.length; m++) {
      var item = clipsToProcess[m];
      var foundClip = item.clip;
      
      if (!foundClip) continue;
      
      var comp = foundClip.getMGTComponent();
      if (!comp) {
        // Fallback: look for a component named "Text"
        if (foundClip.components) {
          for (var c = 0; c < foundClip.components.numItems; c++) {
            if (foundClip.components[c].displayName === "Text") {
              comp = foundClip.components[c];
              break;
            }
          }
        }
      }
      
      if (!comp) {
        if (m === 0 && stillPending.length === 0) { // Log only once per poll for the first clip to avoid spam
          var compNames = [];
          if (foundClip.components) {
            for (var c = 0; c < foundClip.components.numItems; c++) {
              compNames.push(foundClip.components[c].displayName);
            }
          }
          log.push("Clip components: " + compNames.join(", "));
        }
        stillPending.push(item);
        continue;
      }
      
      // Adjust end time to match subtitle duration
      var newEnd = new Time();
      newEnd.seconds = item.endRel;
      foundClip.end = newEnd;
      
      var props = comp.properties;
      var txtProp = props.getParamForDisplayName("Source Text") || props.getParamForDisplayName("Text") || props.getParamForDisplayName("Текст источника") || props.getParamForDisplayName("Текст");
      
      // If MGTComponent doesn't expose text, try to find the inner Text component directly
      if (!txtProp && foundClip.components) {
        for (var c = 0; c < foundClip.components.numItems; c++) {
          if (foundClip.components[c].displayName === "Text") {
            var textCompProps = foundClip.components[c].properties;
            txtProp = textCompProps.getParamForDisplayName("Source Text") || textCompProps.getParamForDisplayName("Text") || textCompProps.getParamForDisplayName("Текст источника") || textCompProps.getParamForDisplayName("Текст");
            if (txtProp) break;
          }
        }
      }
      
      if (!txtProp && comp.displayName === "Text") {
        var pNames = [];
        for (var p = 0; p < props.numItems; p++) {
          pNames.push(props[p].displayName);
        }
        log.push("Text comp properties: " + pNames.join(", "));
      }
      if (txtProp) {
        try { 
          var currentValRaw = txtProp.getValue();
          if (typeof currentValRaw === "object") {
             var keys = [];
             for (var k in currentValRaw) {
               try { keys.push(k + ":" + typeof currentValRaw[k]); } catch(e){}
             }
             log.push("Value is Object! Keys: " + keys.join(", "));
          } else {
             log.push("Value type: " + (typeof currentValRaw));
          }
          var currentVal = currentValRaw ? currentValRaw.toString() : "";
          log.push("String representation starts with: " + currentVal.substring(0, 30));
          
          txtProp.setValue(item.text, 1);
        } catch(e) { log.push("Failed to set text: " + e.toString()); }
      }
    }
    
    AP_PENDING_MGT_CLIPS = stillPending;
    if (stillPending.length > 0) {
      log.push("Waiting for " + stillPending.length + " MOGRTs to initialize...");
    } else {
      log.push("All MOGRTs successfully processed.");
    }
    
    try { app.endUndoGroup(); } catch(e) {}
    return JSON.stringify({ ok: true, logTail: log, pendingCount: stillPending.length });
  } catch (e) {
    try { app.endUndoGroup(); } catch(e) {}
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}

function AP_fillNarratorGaps(paramsJsonString) {
  try {
    var params = JSON.parse(paramsJsonString);

    var proj = app.project;
    if (!proj) throw new Error("No project open.");

    var seq = proj.activeSequence;
    if (!seq) throw new Error("No active sequence.");

    // If a clip is selected, user wants to reroll just that clip.
    if (seq.getSelection() && seq.getSelection().length > 0) {
      return AP_replaceSelected(paramsJsonString);
    }

    var binItem = findItemById(proj.rootItem, params.bin.id);
    if (!binItem) throw new Error("Chosen bin no longer exists.");

    var clips;
    if (params.narratorSourceId && params.narratorSourceId !== "all") {
      // User picked one specific video to fill the gaps from.
      var one = findItemById(proj.rootItem, params.narratorSourceId);
      if (!one) throw new Error("Chosen fill video no longer exists — click Refresh.");
      clips = [one];
    } else {
      clips = collectClips(binItem, !!params.bin.recursive);
    }
    if (clips.length === 0) throw new Error("That bin has no usable clips.");

    try { app.beginUndoGroup("_PR Video Random Cut Narrator Gaps"); } catch (eUndo) {}
    
    var result = apFillNarratorGapsLogic(seq, clips, params);

    try { app.endUndoGroup(); } catch (eUndo) {}

    return JSON.stringify({
      ok: true,
      logTail: result.log,
      summary: result.summary,
      pendingMogrts: result.pendingMogrts
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (eUndo) {}
    return JSON.stringify({ ok: false, error: errorMessage(e) });
  }
}
