// ExtendScript target — ES3-only syntax.
//
// Track *listing* uses the modern documented Sequence DOM. Track *creation*
// has no modern-DOM equivalent, so it drops into the older QE DOM
// (app.enableQE() / qe.project.getActiveSequence().addTracks(...)), which is
// the long-standing community-known way to do this from a script. That one
// call is the least certain API surface in this whole extension, so it's
// wrapped tightly with a message that tells the user exactly how to work
// around it (add tracks by hand, switch that section to "Use existing").

function listVideoTracks(sequence) {
  var out = [];
  for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
    out.push({ index: i, name: sequence.videoTracks[i].name || "" });
  }
  return out;
}

function listAudioTracks(sequence) {
  var out = [];
  for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
    out.push({ index: i, name: sequence.audioTracks[i].name || "" });
  }
  return out;
}

function enableQE() {
  if (typeof qe === "undefined" || !qe) app.enableQE();
  if (typeof qe === "undefined" || !qe) {
    throw new Error("QE DOM unavailable (app.enableQE() did not expose 'qe').");
  }
}

// Returns the resulting track count to use for placement math even if the
// modern DOM's numTracks hasn't refreshed by the time this returns.
function ensureVideoTracks(sequence, desiredCount) {
  var have = sequence.videoTracks.numTracks;
  if (have >= desiredCount) return { added: 0, total: have };
  try {
    enableQE();
    var qeSeq = qe.project.getActiveSequence();
    var toAdd = desiredCount - have;
    qeSeq.addTracks(toAdd, have, 0, 0, 0);
    return { added: toAdd, total: desiredCount };
  } catch (e) {
    throw new Error(
      "Could not auto-create video tracks (" + errorMessage(e) + "). " +
      "Add tracks manually in the timeline, or lower the 'Number of tracks' setting to match what you already have, and run again."
    );
  }
}

function ensureAudioTracks(sequence, desiredCount) {
  var have = sequence.audioTracks.numTracks;
  if (have >= desiredCount) return { added: 0, total: have };
  try {
    enableQE();
    var qeSeq = qe.project.getActiveSequence();
    var toAdd = desiredCount - have;
    qeSeq.addTracks(0, 0, toAdd, have, 1);
    return { added: toAdd, total: desiredCount };
  } catch (e) {
    throw new Error(
      "Could not auto-create audio tracks (" + errorMessage(e) + "). " +
      "Add tracks manually in the timeline, or lower the 'Number of tracks' setting to match what you already have, and run again."
    );
  }
}
