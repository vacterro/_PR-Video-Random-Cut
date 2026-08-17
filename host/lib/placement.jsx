// ExtendScript target — ES3-only syntax.
//
// Core packing engine, run as a resumable state machine (apStartEngine /
// apStepEngine / apCancelEngine / apFinishEngine) instead of one blocking
// call, so the panel's Stop button can interrupt between small batches
// instead of being decorative on top of a single uninterruptible loop.
// AP_ENGINE is a plain global — it persists across separate evalScript
// calls for as long as this panel's ExtendScript engine stays alive, which
// is exactly the lifetime a multi-step run needs.
//
// Every track pool starts as free space spanning the target zone; existing
// clips already on those tracks are subtracted first (so re-running never
// overlaps content that's already there), and each new placement subtracts
// its own span (+ min-gap padding) before the next pick — overlap is
// prevented by construction, not by retrying on collision.
//
// Video tracks additionally support a "playback overlap" choice:
//   - "stack": each track keeps its own independent free space (pieces on
//     different tracks may share a moment in time and will composite/cover
//     each other during playback, same as manually stacking clips).
//   - "none" (default): the whole video track pool shares ONE timeline of
//     free space, so no two pieces ever share a moment regardless of which
//     track they land on — track choice becomes a cosmetic/variety pick
//     made *after* a time slot is found, not a placement constraint.
// Audio tracks are unaffected either way — overlapping audio doesn't hide
// anything the way overlapping video does.
//
// tracks.conflictMode controls whether content already sitting in the zone
// counts as occupied ("keep", default) or is ignored entirely ("replace") —
// in replace mode Track.overwriteClip's normal edit semantics trim/replace
// whatever was there, we just stop pre-blocking that space in our own
// bookkeeping. Either way our own new placements never overlap each other.
//
// In "stack" mode, each track gets its own derived RNG (seed mixed with
// track index) and its own avoid-repeat memory, so which clip lands where
// on one track never rides on the same sequential draw as another track —
// without this, the same source clip could easily end up chosen for two
// different tracks in quick succession, reading as a duplicate. "none" mode
// and one-pass fill don't need this: "none" has only one shared timeline,
// and one-pass never reuses a clip in the first place.

var AP_ENGINE = null;

function audioModeNeedsTracks(audioParams) {
  if (audioParams.mode === "global") return !!audioParams.include;
  if (audioParams.mode === "randomize") return audioParams.probability > 0;
  return true; // mutedlink: audio is always placed, just possibly muted
}

function decideAudioForPiece(rng, audioParams) {
  if (audioParams.mode === "global") {
    return { present: !!audioParams.include, muted: false };
  }
  if (audioParams.mode === "randomize") {
    return { present: rng() < audioParams.probability, muted: false };
  }
  return { present: true, muted: !audioParams.include };
}

function subtractOccupied(intervals, occStart, occEnd) {
  var out = [];
  for (var i = 0; i < intervals.length; i++) {
    var iv = intervals[i];
    if (occEnd <= iv.start || occStart >= iv.end) {
      out.push(iv);
      continue;
    }
    if (occStart > iv.start) out.push({ start: iv.start, end: occStart });
    if (occEnd < iv.end) out.push({ start: occEnd, end: iv.end });
  }
  return out;
}

function scanMaxEnd(trackCollection) {
  var maxEnd = 0;
  for (var i = 0; i < trackCollection.numTracks; i++) {
    var track = trackCollection[i];
    for (var c = 0; c < track.clips.numItems; c++) {
      var e = timeToSeconds(track.clips[c].end);
      if (e > maxEnd) maxEnd = e;
    }
  }
  return maxEnd;
}

function resolveZone(sequence, zoneParams) {
  if (zoneParams.mode === "workarea") {
    var s = timeToSeconds(sequence.getInPoint());
    var e = timeToSeconds(sequence.getOutPoint());
    if (!(e > s)) throw new Error("Work area In/Out isn't set on this sequence.");
    return { start: s, end: e };
  }

  if (zoneParams.mode === "markers") {
    var matches = [];
    var m = sequence.markers.getFirstMarker();
    while (m) {
      if (m.name === zoneParams.markerName) matches.push(m);
      m = sequence.markers.getNextMarker(m);
    }
    if (matches.length === 0) throw new Error("No marker named '" + zoneParams.markerName + "' found.");
    if (matches.length === 1) {
      var s1 = timeToSeconds(matches[0].start);
      var e1 = timeToSeconds(matches[0].end);
      if (!(e1 > s1)) {
        throw new Error("Marker '" + zoneParams.markerName + "' is a point marker — add a second one, or make it a duration marker.");
      }
      return { start: s1, end: e1 };
    }
    var starts = [];
    var ends = [];
    for (var i = 0; i < matches.length; i++) {
      starts.push(timeToSeconds(matches[i].start));
      ends.push(timeToSeconds(matches[i].end));
    }
    return { start: Math.min.apply(null, starts), end: Math.max.apply(null, ends) };
  }

  // whole sequence
  var maxEnd = Math.max(scanMaxEnd(sequence.videoTracks), scanMaxEnd(sequence.audioTracks));
  if (maxEnd <= 0) throw new Error("Sequence appears to be empty — nothing to size 'Whole sequence' from.");
  return { start: 0, end: maxEnd };
}

function resolveTrackPool(sequence, trackParams, mediaType, log) {
  var count = clamp(Math.round(trackParams.autoCount), 1, 10);
  var ignore = trackParams.ignore || [];
  
  var pool = [];
  var currentIdx = 0;
  while (pool.length < count) {
    var shouldIgnore = false;
    for (var i = 0; i < ignore.length; i++) {
      if (ignore[i] === currentIdx) {
        shouldIgnore = true;
        break;
      }
    }
    if (!shouldIgnore) {
      pool.push(currentIdx);
    }
    currentIdx++;
  }
  
  var requiredTotal = pool[pool.length - 1] + 1;
  var result = mediaType === "video" ? ensureVideoTracks(sequence, requiredTotal) : ensureAudioTracks(sequence, requiredTotal);
  if (result && result.added > 0) log.push("Created " + result.added + " " + mediaType + " track(s).");
  
  return pool;
}

function buildFreeMap(sequence, mediaType, pool, zone, respectExisting) {
  var map = {};
  var trackCollection = mediaType === "video" ? sequence.videoTracks : sequence.audioTracks;
  for (var p = 0; p < pool.length; p++) {
    var idx = pool[p];
    var free = [{ start: zone.start, end: zone.end }];
    if (respectExisting && idx < trackCollection.numTracks) {
      var track = trackCollection[idx];
      for (var c = 0; c < track.clips.numItems; c++) {
        var clip = track.clips[c];
        if (clip.disabled) continue;
        free = subtractOccupied(free, timeToSeconds(clip.start), timeToSeconds(clip.end));
      }
    }
    map[idx] = free;
  }
  return map;
}

function clearZone(sequence, videoPool, audioPool, zone) {
  var allTracks = [];
  for (var i = 0; i < videoPool.length; i++) {
    if (videoPool[i] < sequence.videoTracks.numTracks) {
      allTracks.push(sequence.videoTracks[videoPool[i]]);
    }
  }
  for (var j = 0; j < audioPool.length; j++) {
    if (audioPool[j] < sequence.audioTracks.numTracks) {
      allTracks.push(sequence.audioTracks[audioPool[j]]);
    }
  }

  var eps = 0.01;
  for (var t = 0; t < allTracks.length; t++) {
    var track = allTracks[t];
    for (var c = track.clips.numItems - 1; c >= 0; c--) {
      var clip = track.clips[c];
      var s = timeToSeconds(clip.start);
      var e = timeToSeconds(clip.end);
      if (s < zone.end - eps && e > zone.start + eps) {
        try {
          if (typeof clip.remove === "function") {
            clip.remove(false, false);
          } else {
            clip.disabled = true;
          }
        } catch (eRemove) {
          try { clip.disabled = true; } catch (eDis) {}
        }
      }
    }
  }
}

// Video-only: builds either independent per-track free space ("stack") or
// one shared timeline across the whole pool ("none").
function buildVideoFreeState(sequence, videoPool, zone, mode, respectExisting) {
  if (mode === "stack") {
    return { mode: "stack", perTrack: buildFreeMap(sequence, "video", videoPool, zone, respectExisting) };
  }
  var shared = [{ start: zone.start, end: zone.end }];
  if (respectExisting) {
    for (var p = 0; p < videoPool.length; p++) {
      var idx = videoPool[p];
      if (idx < sequence.videoTracks.numTracks) {
        var track = sequence.videoTracks[idx];
        for (var c = 0; c < track.clips.numItems; c++) {
          var clip = track.clips[c];
          if (clip.disabled) continue;
          shared = subtractOccupied(shared, timeToSeconds(clip.start), timeToSeconds(clip.end));
        }
      }
    }
  }
  return { mode: "none", shared: shared };
}

function findFittingSlots(freeMap, pool, duration) {
  var out = [];
  for (var p = 0; p < pool.length; p++) {
    var idx = pool[p];
    var intervals = freeMap[idx] || [];
    for (var i = 0; i < intervals.length; i++) {
      if (intervals[i].end - intervals[i].start >= duration) {
        out.push({ trackIdx: idx, intervalStart: intervals[i].start, intervalEnd: intervals[i].end });
      }
    }
  }
  return out;
}

function findFittingSlotsVideo(state, videoPool, duration) {
  if (state.mode === "stack") return findFittingSlots(state.perTrack, videoPool, duration);
  var out = [];
  for (var i = 0; i < state.shared.length; i++) {
    if (state.shared[i].end - state.shared[i].start >= duration) {
      out.push({ trackIdx: null, intervalStart: state.shared[i].start, intervalEnd: state.shared[i].end });
    }
  }
  return out;
}

function subtractVideoOccupied(state, trackIdx, start, end) {
  if (state.mode === "stack") {
    state.perTrack[trackIdx] = subtractOccupied(state.perTrack[trackIdx], start, end);
  } else {
    state.shared = subtractOccupied(state.shared, start, end);
  }
}

// Best-effort "no information" filter. There is no pixel/frame inspection
// API available from ExtendScript, so this can't detect an actually-black
// picture — what it catches is the far more common real-world cause of a
// clip showing as solid black with nothing readable on it: offline/missing
// media. A sequence used as source content has no media path of its own
// and is never offline in this sense, so it's exempt from this check.
function isOfflineMedia(item) {
  try {
    if (item.isSequence && item.isSequence()) return false;
    var mediaPath = item.getMediaPath();
    return !mediaPath;
  } catch (e) {
    return true;
  }
}

function buildClipMetas(clips, log) {
  var out = [];
  for (var i = 0; i < clips.length; i++) {
    var item = clips[i];
    try {
      if (isOfflineMedia(item)) {
        log.push("Skipped '" + (item.name || "?") + "': offline or missing media (nothing to read).");
        continue;
      }
      var inSec = timeToSeconds(item.getInPoint());
      var outSec = timeToSeconds(item.getOutPoint());
      var dur = outSec - inSec;
      if (!(dur > 0)) {
        log.push("Skipped '" + item.name + "': unreadable or zero duration.");
        continue;
      }
      out.push({ id: item.nodeId, item: item, name: item.name, srcIn: inSec, srcOut: outSec, duration: dur });
    } catch (e) {
      log.push("Skipped '" + (item.name || "?") + "': " + errorMessage(e));
    }
  }
  return out;
}

function calculateUsedDuration(usedSegments) {
  if (!usedSegments || usedSegments.length === 0) return 0;
  // Deep copy to avoid mutating original
  var sorted = [];
  for (var i = 0; i < usedSegments.length; i++) {
    sorted.push({ start: usedSegments[i].start, end: usedSegments[i].end });
  }
  // Sort by start time
  sorted.sort(function(a, b) { return a.start - b.start; });
  
  var total = 0;
  var currentStart = sorted[0].start;
  var currentEnd = sorted[0].end;
  
  for (var j = 1; j < sorted.length; j++) {
    var seg = sorted[j];
    if (seg.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, seg.end);
    } else {
      total += (currentEnd - currentStart);
      currentStart = seg.start;
      currentEnd = seg.end;
    }
  }
  total += (currentEnd - currentStart);
  return total;
}

function isSegmentOverlapping(srcIn, dur, usedSegments, padding) {
  if (!usedSegments || usedSegments.length === 0) return false;
  var start = srcIn - padding;
  var end = srcIn + dur + padding;
  for (var i = 0; i < usedSegments.length; i++) {
    var u = usedSegments[i];
    if (Math.max(start, u.start) < Math.min(end, u.end)) {
      return true; // Overlap detected
    }
  }
  return false;
}

function generatePiece(eng, meta, cutMode, minSec, maxSec, rng, wholeMode) {
  var mode = cutMode === "mixed" ? (rng() < 0.5 ? "subclip" : "whole") : cutMode;

  if (mode === "whole") {
    var dur = meta.duration;
    var srcIn = meta.srcIn;
    
    
    var bestSrcIn = null;
    var bestDur = null;
    var padding = (eng.params.extras.avoidDuplicateSegments && eng.params.extras.segmentPadding) ? eng.params.extras.segmentPadding : 0;
    
    for (var attempt = 0; attempt < 50; attempt++) {
      var attemptDur = dur;
      var attemptTrimTo = maxSec;
      if (wholeMode === "integerRange") {
        attemptTrimTo = Math.floor(randRange(rng, Math.ceil(minSec), Math.floor(maxSec) + 1));
        if (attemptTrimTo > maxSec) attemptTrimTo = Math.floor(maxSec);
        if (attemptTrimTo < minSec) attemptTrimTo = Math.ceil(minSec);
      } else if (wholeMode === "floatRange") {
        attemptTrimTo = randRange(rng, minSec, maxSec);
      }
      
      var attemptSrcIn = meta.srcIn;
      if (attemptDur > attemptTrimTo) {
        attemptDur = attemptTrimTo;
        attemptSrcIn = meta.srcIn + randRange(rng, 0, meta.duration - attemptDur);
      }
      
      if (!eng.params.extras.avoidDuplicateSegments) {
        bestSrcIn = attemptSrcIn;
        bestDur = attemptDur;
        break;
      }
      
      if (!isSegmentOverlapping(attemptSrcIn, attemptDur, eng.usedSegmentsBySource[meta.id], padding)) {
        bestSrcIn = attemptSrcIn;
        bestDur = attemptDur;
        break;
      }
    }
    
    // Fallback if all 50 attempts failed to find a non-overlapping segment
    if (bestSrcIn === null) {
      bestDur = dur;
      var fbTrimTo = maxSec;
      if (wholeMode === "integerRange") fbTrimTo = Math.floor(randRange(rng, Math.ceil(minSec), Math.floor(maxSec) + 1));
      else if (wholeMode === "floatRange") fbTrimTo = randRange(rng, minSec, maxSec);
      if (bestDur > fbTrimTo) {
        bestDur = Math.max(minSec, fbTrimTo);
        bestSrcIn = meta.srcIn + randRange(rng, 0, meta.duration - bestDur);
      } else {
        bestSrcIn = meta.srcIn;
      }
    }

    if (!eng.usedSegmentsBySource[meta.id]) eng.usedSegmentsBySource[meta.id] = [];
    eng.usedSegmentsBySource[meta.id].push({ start: bestSrcIn, end: bestSrcIn + bestDur });

    return { duration: bestDur, srcIn: bestSrcIn, srcOut: bestSrcIn + bestDur };
  }

  var padding2 = (eng.params.extras.avoidDuplicateSegments && eng.params.extras.segmentPadding) ? eng.params.extras.segmentPadding : 0;
  var bestSrcIn2 = null;
  var bestDur2 = null;

  for (var attempt = 0; attempt < 50; attempt++) {
    var wantDur2 = randRange(rng, minSec, maxSec);
    var attemptDur2 = Math.min(wantDur2, meta.duration);
    var maxOffset2 = meta.duration - attemptDur2;
    var attemptSrcIn2 = meta.srcIn + (maxOffset2 > 0 ? randRange(rng, 0, maxOffset2) : 0);

    if (!eng.params.extras.avoidDuplicateSegments) {
      bestSrcIn2 = attemptSrcIn2;
      bestDur2 = attemptDur2;
      break;
    }
    
    if (!isSegmentOverlapping(attemptSrcIn2, attemptDur2, eng.usedSegmentsBySource[meta.id], padding2)) {
      bestSrcIn2 = attemptSrcIn2;
      bestDur2 = attemptDur2;
      break;
    }
  }

  if (bestSrcIn2 === null) {
    var fbWantDur = randRange(rng, minSec, maxSec);
    bestDur2 = Math.min(fbWantDur, meta.duration);
    var fbMaxOffset = meta.duration - bestDur2;
    bestSrcIn2 = meta.srcIn + (fbMaxOffset > 0 ? randRange(rng, 0, fbMaxOffset) : 0);
  }

  if (!eng.usedSegmentsBySource[meta.id]) eng.usedSegmentsBySource[meta.id] = [];
  eng.usedSegmentsBySource[meta.id].push({ start: bestSrcIn2, end: bestSrcIn2 + bestDur2 });

  return { duration: bestDur2, srcIn: bestSrcIn2, srcOut: bestSrcIn2 + bestDur2 };
}

function findClipAtStart(track, startSec, epsilon) {
  for (var i = 0; i < track.clips.numItems; i++) {
    var c = track.clips[i];
    if (Math.abs(timeToSeconds(c.start) - startSec) < epsilon) return c;
  }
  return null;
}

function clearGhosts(sequence, meta, targetStart, skipVideoTrackIdx, skipAudioTrackIdx) {
  var epsilon = 0.05;
  for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
    if (i === skipVideoTrackIdx) continue;
    var track = sequence.videoTracks[i];
    for (var c = track.clips.numItems - 1; c >= 0; c--) {
      var clip = track.clips[c];
      if (clip && clip.name === meta.name && Math.abs(timeToSeconds(clip.start) - targetStart) < epsilon) {
        try { clip.remove(false, false); } catch(e) {}
      }
    }
  }
  for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
    if (i === skipAudioTrackIdx) continue;
    var track = sequence.audioTracks[i];
    for (var c = track.clips.numItems - 1; c >= 0; c--) {
      var clip = track.clips[c];
      if (clip && clip.name === meta.name && Math.abs(timeToSeconds(clip.start) - targetStart) < epsilon) {
        try { clip.remove(false, false); } catch(e) {}
      }
    }
  }
}

function uniqueCount(list, key) {
  var seen = {};
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    if (!seen[list[i][key]]) {
      seen[list[i][key]] = true;
      n++;
    }
  }
  return n;
}

function chooseClipForTrack(eng, rng, recentIds, forbiddenIds) {
  var pool = [];
  forbiddenIds = forbiddenIds || [];
  
  var avoidLimit = Math.max(0, parseInt(eng.params.extras.avoidRepeat) || 0);
  // Cap avoidance so we don't dead-end if the pool is too small.
  avoidLimit = Math.min(avoidLimit, Math.max(0, eng.clipMetas.length - 1));

  for (var i = 0; i < eng.clipMetas.length; i++) {
    var meta = eng.clipMetas[i];
    
    // Strict exhaustion check
    var totalUsedDur = calculateUsedDuration(eng.usedSegmentsBySource[meta.id]);
    if (totalUsedDur >= meta.duration - eng.params.cut.minSec) {
      continue; // Skip exhausted clips
    }

    var isForbidden = false;
    for (var f = 0; f < forbiddenIds.length; f++) {
      if (forbiddenIds[f] === meta.id) { isForbidden = true; break; }
    }
    
    // Check if it's in the recent history we are avoiding
    for (var r = 0; r < avoidLimit; r++) {
      if (recentIds[r] === meta.id) { isForbidden = true; break; }
    }

    if (!isForbidden) pool.push(meta);
  }
  
  if (pool.length === 0 && eng.clipMetas.length > 0) {
    // If all clips are exhausted, we might still want to fallback or stop.
    // If we return null, the placement loop will break for this track.
    return null;
  }

  // Check if we have custom clip weights enabled
  var useWeights = false;
  if (eng.params.clipWeights) {
    for (var k in eng.params.clipWeights) {
      if (eng.params.clipWeights.hasOwnProperty(k)) {
        useWeights = true;
        break;
      }
    }
  }

  if (useWeights) {
    // Weighted random selection
    var totalWeight = 0;
    for (var w = 0; w < pool.length; w++) {
      var wVal = eng.params.clipWeights[pool[w].id];
      if (wVal === undefined || wVal === null) wVal = 1.0;
      totalWeight += wVal;
    }
    
    var rVal = rng() * totalWeight;
    var currentSum = 0;
    for (var w = 0; w < pool.length; w++) {
      var wVal = eng.params.clipWeights[pool[w].id];
      if (wVal === undefined || wVal === null) wVal = 1.0;
      currentSum += wVal;
      if (rVal <= currentSum) {
        return pool[w];
      }
    }
    return pool[pool.length - 1]; // Fallback to last
  }

  // Strict round-robin fairness
  // Find the lowest usage count among the available pool
  var minUsage = Infinity;
  for (var p = 0; p < pool.length; p++) {
    var usage = eng.usageCount[pool[p].id] || 0;
    if (usage < minUsage) minUsage = usage;
  }
  
  // Restrict the pool to only clips with the lowest usage count
  var fairPool = [];
  for (var p = 0; p < pool.length; p++) {
    if ((eng.usageCount[pool[p].id] || 0) === minUsage) {
      fairPool.push(pool[p]);
    }
  }

  return pick(rng, fairPool);
}

function chooseClipFromEngine(eng) {
  return chooseClipForTrack(eng, eng.rng, eng.recentIds, []);
}

// Lazily creates one independent RNG per video track, seeded from the run's
// master seed mixed with the track index — same seed always reproduces the
// same per-track sequence, but tracks never share a cursor with each other.
function getTrackRng(eng, trackIdx) {
  if (!eng.trackRngs[trackIdx]) {
    eng.trackRngs[trackIdx] = makeRng((eng.params.extras.seed || 1) * 97 + (trackIdx + 1) * 7919);
  }
  return eng.trackRngs[trackIdx];
}

// Where to land inside a free interval that's bigger than the piece.
// "packed" always hugs the start. Otherwise pick a random spot, but never
// strand a leftover sliver smaller than the min cut length on either side —
// that space could never be filled by anything anyway, so it'd just sit
// there as a permanent, pointless gap. Snapping it away costs nothing and
// keeps "Scattered" converging on full zone coverage instead of leaving
// unfillable crumbs behind.
function pickOffset(rng, maxOffset, packed, minSec) {
  if (packed || maxOffset <= 0) return 0;
  var offset = randRange(rng, 0, maxOffset);
  if (offset < minSec) return 0;
  if (maxOffset - offset < minSec) return maxOffset;
  return offset;
}

// Shared tail end for both placement paths below: commits the video clip,
// pairs up audio if needed, drops a marker, and records the result. `rng` is
// whichever stream owns this placement — the engine's shared one in "none"
// mode / one-pass, or a specific track's own one in "stack" mode.
function commitVideoPlacement(eng, meta, piece, trackIdx, start, end, rng) {
  var packed = eng.params.tracks.video.packing === "packed";

  try {
    meta.item.setInPoint(piece.srcIn, MEDIA_TYPE_ALL);
    meta.item.setOutPoint(piece.srcOut, MEDIA_TYPE_ALL);
    if (eng.params.extras.scaleMode === "fitFrame") {
      try { meta.item.setScaleToFrameSize(); } catch(e) {}
    }
  } catch (eIO) {
    // proceed with whatever in/out the bin item already has
  }

  var vTrack = eng.sequence.videoTracks[trackIdx];
  var videoPlaced = false;
  var actualEnd = end;
  try {
    var placedVideo = vTrack.overwriteClip(meta.item, start);
    var actualClip = findClipAtStart(vTrack, start, 0.05);
    if (placedVideo || actualClip) {
      videoPlaced = true;
      if (actualClip) {
        if (eng.params.extras.scaleMode === "fitWidth" || eng.params.extras.scaleMode === "fitHeight") {
          applyScalingMode(eng.sequence, actualClip, meta.item, eng.params.extras.scaleMode);
        }
        actualEnd = timeToSeconds(actualClip.end);
      }
      clearGhosts(eng.sequence, meta, start, trackIdx, -1);
    }
  } catch (eV) {
    // Fails to place video (e.g. audio-only clip or track locked). Do not abort yet, try audio.
    videoPlaced = false;
  }

  if (videoPlaced) {
    subtractVideoOccupied(eng.videoFreeState, trackIdx, start - eng.minGap, actualEnd + eng.minGap);
  }

  var audioNote = "";
  var audioPlaced = false;
  if (eng.needsAudio) {
    var decision = decideAudioForPiece(rng, eng.params.audio);
    if (decision.present && eng.audioPool.length > 0) {
      var aCandidates = findFittingSlots(eng.audioFree, eng.audioPool, piece.duration);
      if (aCandidates.length > 0) {
        var fitsSameSpot = null;
        for (var i = 0; i < aCandidates.length; i++) {
          if (start >= aCandidates[i].intervalStart && end <= aCandidates[i].intervalEnd) {
            fitsSameSpot = aCandidates[i];
            break;
          }
        }
        if (packed && !fitsSameSpot) {
          aCandidates.sort(function(a, b) { return a.intervalStart - b.intervalStart; });
        }
        var aSlot = fitsSameSpot || (packed ? aCandidates[0] : pick(rng, aCandidates));
        var aMaxOffset = aSlot.intervalEnd - aSlot.intervalStart - piece.duration;
        var aStart = fitsSameSpot ? start : aSlot.intervalStart + pickOffset(rng, aMaxOffset, packed, eng.minSec);
        var aTrack = eng.sequence.audioTracks[aSlot.trackIdx];
        var aActualEnd = aStart + piece.duration;
        try {
          var placedAudio = aTrack.overwriteClip(meta.item, aStart);
          var aActualClip = findClipAtStart(aTrack, aStart, 0.05);
          if (placedAudio || aActualClip) {
            audioPlaced = true;
            if (aActualClip) {
              aActualEnd = timeToSeconds(aActualClip.end);
            }
            var skipVideo = (videoPlaced && Math.abs(aStart - start) < 0.01) ? trackIdx : -1;
            clearGhosts(eng.sequence, meta, aStart, skipVideo, aSlot.trackIdx);
            eng.audioFree[aSlot.trackIdx] = subtractOccupied(eng.audioFree[aSlot.trackIdx], aStart - eng.minGap, aActualEnd + eng.minGap);
            audioNote = " +A" + (aSlot.trackIdx + 1);
            if (decision.muted) {
              var aItem = placedAudio || findClipAtStart(aTrack, aStart, 0.05);
              if (aItem) {
                try { aItem.disabled = true; audioNote += " (muted)"; } catch (eMute) {}
              }
            }
          }
        } catch (eA) {
          audioNote = " (audio skipped: " + errorMessage(eA) + ")";
        }
      }
    }
  }

  if (eng.params.extras.addMarkers) {
    try {
      var mk = eng.sequence.markers.createMarker(start);
      mk.name = meta.name;
    } catch (eMk) {}
  }

  if (!videoPlaced && !audioPlaced) {
    eng.log.push("Skipped '" + meta.name + "': failed to place on both video and audio tracks.");
    return false;
  }

  if (!videoPlaced) {
    audioNote = " (Audio ONLY)" + audioNote;
  }

  eng.placements.push({ track: trackIdx, start: start, end: start + piece.duration, duration: piece.duration, sourceId: meta.id });
  if (videoPlaced) eng.filledTotal += piece.duration;
  if (videoPlaced) {
    eng.log.push("V" + (trackIdx + 1) + " " + formatShort(start) + "-" + formatShort(end) + "  " + meta.name + audioNote);
  } else {
    eng.log.push("A* " + formatShort(start) + "-" + formatShort(end) + "  " + meta.name + audioNote);
  }
  return true;
}

// "none" playback mode (any fill mode) and one-pass fill (any playback
// mode): single shared engine rng, single global avoid-repeat memory.
function apTryPlaceOne(eng, meta) {
  var packed = eng.params.tracks.video.packing === "packed";
  var dynamicMinSec = eng.minSec;
  var dynamicMaxSec = eng.maxSec;

  if (packed) {
    var minCandidates = findFittingSlotsVideo(eng.videoFreeState, eng.videoPool, eng.minSec);
    if (minCandidates.length > 0) {
      var gap = minCandidates[0].intervalEnd - minCandidates[0].intervalStart;
      dynamicMaxSec = Math.min(eng.maxSec, gap);
      if (gap < eng.minSec) {
        dynamicMinSec = Math.min(dynamicMaxSec, meta.duration);
      } else {
        dynamicMinSec = eng.minSec;
      }
    }
  }

  var piece = generatePiece(eng, meta, eng.params.cut.mode, dynamicMinSec, dynamicMaxSec, eng.rng, eng.params.cut.wholeMode);
  if (!(piece.duration >= eng.minSec)) return false;

  var candidates = findFittingSlotsVideo(eng.videoFreeState, eng.videoPool, piece.duration);
  if (candidates.length === 0) return false;

  var slot = packed ? candidates[0] : pick(eng.rng, candidates);
  
  if (packed) {
    var rawOffset = slot.intervalEnd - slot.intervalStart - piece.duration;
    if (rawOffset > 0 && rawOffset < eng.minSec) {
      if (piece.duration + rawOffset <= meta.duration) {
        piece.duration += rawOffset;
        piece.srcOut += rawOffset;
      } else {
        var shrinkAmount = eng.minSec - rawOffset;
        if (piece.duration - shrinkAmount >= eng.minSec) {
          piece.duration -= shrinkAmount;
          piece.srcOut -= shrinkAmount;
        } else {
          return false;
        }
      }
    }
  }

  var trackIdx = slot.trackIdx !== null ? slot.trackIdx : pick(eng.rng, eng.videoPool);
  var maxOffset = slot.intervalEnd - slot.intervalStart - piece.duration;
  var start = slot.intervalStart + pickOffset(eng.rng, maxOffset, packed, eng.minSec);
  var end = start + piece.duration;

  var placedOk = commitVideoPlacement(eng, meta, piece, trackIdx, start, end, eng.rng);
  if (placedOk) {
    eng.recentIds.unshift(meta.id);
    if (eng.recentIds.length > 100) eng.recentIds.pop();
    eng.usageCount[meta.id] = (eng.usageCount[meta.id] || 0) + 1;
  }
  return placedOk;
}

// "stack" playback mode for count/fillzone: pick which track gets this
// attempt first (using the shared engine rng, which only affects scheduling,
// not content), then hand everything content-related — clip choice,
// duration, offset, avoid-repeat — to that track's own independent rng.
function apTryPlaceOneStack(eng) {
  var trackIdx = pick(eng.rng, eng.videoPool);
  var trackRng = getTrackRng(eng, trackIdx);
  if (!eng.recentIdsByTrack[trackIdx]) eng.recentIdsByTrack[trackIdx] = [];
  var lastId = eng.recentIdsByTrack[trackIdx];

  var packed = eng.params.tracks.video.packing === "packed";
  var dynamicMinSec = eng.minSec;
  var dynamicMaxSec = eng.maxSec;
  
  var minFitting = [];
  if (packed) {
    minFitting = findFittingSlots(eng.videoFreeState.perTrack, [trackIdx], eng.minSec);
  }

  var forbiddenIds = [];
  if (minFitting.length > 0) {
    var targetStart = minFitting[0].intervalStart;
    for (var k = 0; k < eng.placements.length; k++) {
      var p = eng.placements[k];
      if (p.start <= targetStart && p.end > targetStart) {
        forbiddenIds.push(p.sourceId);
      }
    }
  }

  var meta = chooseClipForTrack(eng, trackRng, lastId, forbiddenIds);
  if (!meta) return false;
  
  if (minFitting.length > 0) {
    var gap = minFitting[0].intervalEnd - minFitting[0].intervalStart;
    dynamicMaxSec = Math.min(eng.maxSec, gap);
    if (gap < eng.minSec) {
      dynamicMinSec = Math.min(dynamicMaxSec, meta.duration);
    } else {
      dynamicMinSec = eng.minSec;
    }
  }

  var piece = generatePiece(eng, meta, eng.params.cut.mode, dynamicMinSec, dynamicMaxSec, trackRng, eng.params.cut.wholeMode);
  if (!(piece.duration >= eng.minSec)) return false;

  var fitting = findFittingSlots(eng.videoFreeState.perTrack, [trackIdx], piece.duration);
  if (fitting.length === 0) return false;

  var slot = packed ? fitting[0] : pick(trackRng, fitting);
  
  if (packed) {
    var rawOffset = slot.intervalEnd - slot.intervalStart - piece.duration;
    if (rawOffset > 0 && rawOffset < eng.minSec) {
      if (piece.duration + rawOffset <= meta.duration) {
        piece.duration += rawOffset;
        piece.srcOut += rawOffset;
      } else {
        var shrinkAmount = eng.minSec - rawOffset;
        if (piece.duration - shrinkAmount >= eng.minSec) {
          piece.duration -= shrinkAmount;
          piece.srcOut -= shrinkAmount;
        } else {
          return false;
        }
      }
    }
  }

  var maxOffset = slot.intervalEnd - slot.intervalStart - piece.duration;
  var start = slot.intervalStart + pickOffset(trackRng, maxOffset, packed, eng.minSec);
  var end = start + piece.duration;

  var placedOk = commitVideoPlacement(eng, meta, piece, trackIdx, start, end, trackRng);
  if (placedOk) {
    eng.recentIdsByTrack[trackIdx].unshift(meta.id);
    if (eng.recentIdsByTrack[trackIdx].length > 100) eng.recentIdsByTrack[trackIdx].pop();
    eng.usageCount[meta.id] = (eng.usageCount[meta.id] || 0) + 1;
  }
  return placedOk;
}

// ---- resumable engine lifecycle ----

function apStartEngine(sequence, clips, params) {
  var rng = makeRng(params.extras.seed || 1);
  var log = [];

  var zone = resolveZone(sequence, params.zone);
  log.push("Zone: " + formatShort(zone.start) + " - " + formatShort(zone.end));

  var videoPool = resolveTrackPool(sequence, params.tracks.video, "video", log);
  var needsAudio = audioModeNeedsTracks(params.audio);
  var audioPool = needsAudio ? resolveTrackPool(sequence, params.tracks.audio, "audio", log) : [];

  var playbackMode = params.tracks.video.playbackOverlap === "stack" ? "stack" : "none";
  var respectExisting = params.tracks.conflictMode !== "replace";
  if (!respectExisting) {
    log.push("Replace mode: clearing existing content in the zone on target tracks...");
    clearZone(sequence, videoPool, audioPool, zone);
  }
  var videoFreeState = buildVideoFreeState(sequence, videoPool, zone, playbackMode, respectExisting);
  var audioFree = needsAudio ? buildFreeMap(sequence, "audio", audioPool, zone, respectExisting) : {};

  var clipMetas = buildClipMetas(clips, log);
  if (clipMetas.length === 0) throw new Error("No usable clips with readable in/out found in the chosen bin.");

  var minSec = Math.max(0.05, Math.min(params.cut.minSec, params.cut.maxSec));
  var maxSec = Math.max(minSec, params.cut.maxSec);
  // The panel sends extras.minGap; older payloads said extras.minGapSec — accept both.
  var minGapParam = params.extras.minGap != null ? params.extras.minGap : params.extras.minGapSec;
  var minGap = params.tracks.video.packing === "packed" ? 0 : Math.max(0, minGapParam || 0);

  // "percent" fill target: fraction of the zone to cover with placed video.
  // In stack mode every track is its own lane, so the target scales by lane
  // count — 60% with 3 tracks means each lane ends up ~60% covered.
  var zoneLen = zone.end - zone.start;
  var fillTargetSeconds = null;
  if (params.fill.mode === "percent") {
    var pctTarget = clamp(parseFloat(params.fill.percent) || 100, 1, 100) / 100;
    fillTargetSeconds = pctTarget * zoneLen * (playbackMode === "stack" ? videoPool.length : 1);
  }

  AP_ENGINE = {
    sequence: sequence,
    params: params,
    rng: rng,
    log: log,
    logSentIndex: 0,
    zone: zone,
    videoPool: videoPool,
    audioPool: audioPool,
    needsAudio: needsAudio,
    videoFreeState: videoFreeState,
    audioFree: audioFree,
    clipMetas: clipMetas,
    minSec: minSec,
    maxSec: maxSec,
    minGap: minGap,
    placements: [],
    filledTotal: 0,
    fillTargetSeconds: fillTargetSeconds,
    recentIds: [],
    trackRngs: {},
    recentIdsByTrack: {},
    usedSegmentsBySource: {},
    usageCount: {},
    attempts: 0,
    consecutiveFail: 0,
    onePassOrder: params.fill.mode === "onepass" ? shuffle(rng, clipMetas) : null,
    onePassIndex: 0,
    done: false,
    safetyCap: 4000,
    failCap: 40
  };

  return { started: true };
}

// Runs up to maxIterations attempts, then returns control. Never throws for
// ordinary placement failures (those are logged and skipped) — only setup
// problems upstream in apStartEngine throw.
function apStepEngine(maxIterations) {
  var eng = AP_ENGINE;
  var iterations = 0;

  while (!eng.done && iterations < maxIterations) {
    if (eng.params.fill.mode === "onepass" && eng.onePassIndex >= eng.onePassOrder.length) {
      eng.done = true;
      break;
    }

    iterations++;
    eng.attempts++;

    var before = eng.placements.length;
    if (eng.params.fill.mode === "onepass") {
      apTryPlaceOne(eng, eng.onePassOrder[eng.onePassIndex++]);
    } else if (eng.videoFreeState.mode === "stack") {
      var meta = chooseClipFromEngine(eng);
      if (!meta) {
        eng.log.push("All clips exhausted or pool empty.");
        break;
      }
      if (eng.params.tracks.video.playbackOverlap === "stack") {
        apTryPlaceOneStack(eng);
      } else {
        apTryPlaceOne(eng, meta);
      }
    } else {
      apTryPlaceOne(eng, chooseClipFromEngine(eng));
    }
    eng.consecutiveFail = eng.placements.length > before ? 0 : eng.consecutiveFail + 1;

    if (eng.attempts >= eng.safetyCap) {
      eng.done = true;
    } else if (eng.params.fill.mode === "count" && eng.placements.length >= Math.max(1, eng.params.fill.count)) {
      eng.done = true;
    } else if (eng.params.fill.mode === "percent" && eng.fillTargetSeconds !== null && eng.filledTotal >= eng.fillTargetSeconds) {
      eng.done = true;
    } else if (eng.params.fill.mode !== "onepass" && eng.consecutiveFail >= eng.failCap) {
      eng.done = true;
    } else if (eng.params.fill.mode === "onepass" && eng.onePassIndex >= eng.onePassOrder.length) {
      eng.done = true;
    }
  }

  var tail = eng.log.slice(eng.logSentIndex);
  eng.logSentIndex = eng.log.length;

  return { done: eng.done, placed: eng.placements.length, attempts: eng.attempts, logTail: tail };
}

function apFinishEngine() {
  var eng = AP_ENGINE;

  for (var c = 0; c < eng.clipMetas.length; c++) {
    try {
      eng.clipMetas[c].item.clearInPoint(MEDIA_TYPE_ALL);
      eng.clipMetas[c].item.clearOutPoint(MEDIA_TYPE_ALL);
    } catch (eClear) {}
  }

  var zoneLen = eng.zone.end - eng.zone.start;
  var filled = 0;
  for (var k = 0; k < eng.placements.length; k++) filled += eng.placements[k].duration;
  var pct = zoneLen > 0 ? Math.round((filled / zoneLen) * 100) : 0;

  var tail = eng.log.slice(eng.logSentIndex);
  eng.logSentIndex = eng.log.length;

  var result = {
    summary: {
      placed: eng.placements.length,
      videoTracksUsed: uniqueCount(eng.placements, "track"),
      audioTracksUsed: eng.needsAudio ? eng.audioPool.length : 0,
      zoneFillPercent: clamp(pct, 0, 100)
    },
    logTail: tail
  };

  AP_ENGINE = null;
  return result;
}

function applyScalingMode(sequence, trackItem, projectItem, mode) {
  if (mode !== "fitWidth" && mode !== "fitHeight") return;
  
  var seqWidth = 1920;
  var seqHeight = 1080;
  try {
    var seqMeta = sequence.projectItem.getProjectMetadata();
    var seqMatch = seqMeta.match(/<premierePrivateProjectMetaData:Column\.Intrinsic\.VideoInfo>(\d+)\s*x\s*(\d+)/);
    if (seqMatch) {
        seqWidth = parseInt(seqMatch[1], 10);
        seqHeight = parseInt(seqMatch[2], 10);
    }
  } catch(e) {}
  
  var clipWidth = 1920;
  var clipHeight = 1080;
  try {
    var clipMeta = projectItem.getProjectMetadata();
    var clipMatch = clipMeta.match(/<premierePrivateProjectMetaData:Column\.Intrinsic\.VideoInfo>(\d+)\s*x\s*(\d+)/);
    if (clipMatch) {
        clipWidth = parseInt(clipMatch[1], 10);
        clipHeight = parseInt(clipMatch[2], 10);
    }
  } catch(e) {}
  
  var ratio = 1.0;
  if (mode === "fitWidth") {
    ratio = seqWidth / clipWidth;
  } else {
    ratio = seqHeight / clipHeight;
  }
  
  try {
    var motion = trackItem.components[1];
    if (motion && motion.displayName === "Motion") {
        var scaleProp = motion.properties.getParamForDisplayName("Scale");
        if (scaleProp) scaleProp.setValue(ratio * 100, true);
    }
  } catch(e) {}
}

function apCancelEngine() {
  AP_ENGINE.log.push("Stopped by user after " + AP_ENGINE.placements.length + " piece(s).");
  return apFinishEngine();
}
