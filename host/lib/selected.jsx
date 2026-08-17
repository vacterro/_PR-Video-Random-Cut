// ExtendScript target — ES3-only syntax.
//
// "Replace selected with a new random clip": for every clip the user has
// selected in the timeline, swap in a random piece from the source bin that
// has EXACTLY the same duration and sits at exactly the same track/position.
// The layout is untouched — only the content changes. Built for the "this
// particular piece doesn't fit the vibe, reroll just it" moment, instead of
// rerolling the entire zone.
//
// Selection is read via TrackItem.isSelected() (present since PPro 12) by
// scanning every track — Sequence.getSelection() isn't reliable across the
// 2022+ range. A selected video clip's paired audio (same name, same start,
// tool-placed pairs look like that) is replaced together with it even if
// only the video half was clicked; a selected audio-only clip is rerolled
// as audio alone.

function collectSelectedJobs(seq) {
  var jobs = [];
  var t, c, clip;

  for (t = 0; t < seq.videoTracks.numTracks; t++) {
    var vTrack = seq.videoTracks[t];
    for (c = 0; c < vTrack.clips.numItems; c++) {
      clip = vTrack.clips[c];
      try {
        if (clip.isSelected && clip.isSelected()) {
          jobs.push({
            kind: "video",
            trackIdx: t,
            start: timeToSeconds(clip.start),
            end: timeToSeconds(clip.end),
            name: clip.name
          });
        }
      } catch (eSel) {}
    }
  }

  for (t = 0; t < seq.audioTracks.numTracks; t++) {
    var aTrack = seq.audioTracks[t];
    for (c = 0; c < aTrack.clips.numItems; c++) {
      clip = aTrack.clips[c];
      try {
        if (clip.isSelected && clip.isSelected()) {
          jobs.push({
            kind: "audio",
            trackIdx: t,
            start: timeToSeconds(clip.start),
            end: timeToSeconds(clip.end),
            name: clip.name
          });
        }
      } catch (eSel) {}
    }
  }

  return jobs;
}

// Audio jobs that mirror a selected video job (same name, same start) are its
// linked half — fold them into the video job so the pair rerolls as one unit.
function pairSelectedJobs(jobs) {
  var eps = 0.05;
  var videoJobs = [];
  var audioJobs = [];
  var i, j;

  for (i = 0; i < jobs.length; i++) {
    if (jobs[i].kind === "video") videoJobs.push(jobs[i]);
    else audioJobs.push(jobs[i]);
  }

  var loneAudio = [];
  for (i = 0; i < audioJobs.length; i++) {
    var a = audioJobs[i];
    var paired = false;
    for (j = 0; j < videoJobs.length; j++) {
      var v = videoJobs[j];
      if (v.name === a.name && Math.abs(v.start - a.start) < eps) {
        v.audioTrackIdx = a.trackIdx;
        paired = true;
        break;
      }
    }
    if (!paired) loneAudio.push(a);
  }

  return { video: videoJobs, audio: loneAudio };
}

// Also hunt down the unselected linked audio of a selected video clip — the
// user selected "the clip", not "the video half of the clip".
function findLinkedAudioTrack(seq, job) {
  var eps = 0.05;
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    var track = seq.audioTracks[t];
    for (var c = 0; c < track.clips.numItems; c++) {
      var clip = track.clips[c];
      if (clip.name === job.name && Math.abs(timeToSeconds(clip.start) - job.start) < eps) {
        return t;
      }
    }
  }
  return -1;
}

function chooseReplacementMeta(rng, pool, duration, oldName) {
  var fits = [];
  var fitsDifferent = [];
  for (var i = 0; i < pool.length; i++) {
    if (pool[i].duration >= duration) {
      fits.push(pool[i]);
      if (pool[i].name !== oldName) fitsDifferent.push(pool[i]);
    }
  }
  // Prefer a different source than what's being replaced — a reroll that
  // lands the same episode again just looks broken to the user.
  if (fitsDifferent.length > 0) return pick(rng, fitsDifferent);
  if (fits.length > 0) return pick(rng, fits);
  return null;
}

function apReplaceSelectedLogic(seq, clips, params) {
  var log = [];
  var rng = makeRng(params.extras.seed || 1);

  var pool = buildClipMetas(clips, log);
  if (pool.length === 0) throw new Error("No usable clips in the chosen bin.");

  var jobs = collectSelectedJobs(seq);
  if (jobs.length === 0) {
    throw new Error("Nothing is selected in the timeline. Click the clip(s) you want rerolled, then press this button again.");
  }

  var paired = pairSelectedJobs(jobs);
  var replaced = 0;
  var i;

  for (i = 0; i < paired.video.length; i++) {
    var job = paired.video[i];
    var dur = job.end - job.start;
    if (!(dur > 0)) continue;

    var meta = chooseReplacementMeta(rng, pool, dur, job.name);
    if (!meta) {
      log.push("Skipped '" + job.name + "': no source clip is long enough for its " + formatShort(dur) + " slot.");
      continue;
    }

    var srcIn = meta.srcIn + (meta.duration > dur ? randRange(rng, 0, meta.duration - dur) : 0);
    try {
      meta.item.setInPoint(srcIn, MEDIA_TYPE_ALL);
      meta.item.setOutPoint(srcIn + dur, MEDIA_TYPE_ALL);
      if (params.extras.scaleMode === "fitFrame") {
        try { meta.item.setScaleToFrameSize(); } catch (eScale) {}
      }
    } catch (eIO) {
      log.push("Skipped '" + job.name + "': " + errorMessage(eIO));
      continue;
    }

    var audioTrackIdx = job.audioTrackIdx !== undefined ? job.audioTrackIdx : findLinkedAudioTrack(seq, job);

    try {
      var vTrack = seq.videoTracks[job.trackIdx];
      // Overwrite at the exact same span — Premiere's overwrite semantics
      // replace what's underneath, so the old piece dies and the new one
      // takes its exact place. Duration identical by construction.
      vTrack.overwriteClip(meta.item, job.start);
      clearGhosts(seq, meta, job.start, job.trackIdx, -1);

      var placedClip = findClipAtStart(vTrack, job.start, 0.05);
      if (placedClip && (params.extras.scaleMode === "fitWidth" || params.extras.scaleMode === "fitHeight")) {
        applyScalingMode(seq, placedClip, meta.item, params.extras.scaleMode);
      }

      if (audioTrackIdx >= 0 && audioTrackIdx < seq.audioTracks.numTracks) {
        try {
          seq.audioTracks[audioTrackIdx].overwriteClip(meta.item, job.start);
          clearGhosts(seq, meta, job.start, job.trackIdx, audioTrackIdx);
        } catch (eAud) {
          log.push("'" + job.name + "': video replaced, but its audio half failed (" + errorMessage(eAud) + ").");
        }
      }

      replaced++;
      log.push("V" + (job.trackIdx + 1) + " " + formatShort(job.start) + "-" + formatShort(job.end) + "  '" + job.name + "' -> '" + meta.name + "'");
    } catch (ePlace) {
      log.push("Skipped '" + job.name + "': " + errorMessage(ePlace));
    }
  }

  for (i = 0; i < paired.audio.length; i++) {
    var aJob = paired.audio[i];
    var aDur = aJob.end - aJob.start;
    if (!(aDur > 0)) continue;

    var aMeta = chooseReplacementMeta(rng, pool, aDur, aJob.name);
    if (!aMeta) {
      log.push("Skipped '" + aJob.name + "': no source clip is long enough for its " + formatShort(aDur) + " slot.");
      continue;
    }

    var aSrcIn = aMeta.srcIn + (aMeta.duration > aDur ? randRange(rng, 0, aMeta.duration - aDur) : 0);
    try {
      aMeta.item.setInPoint(aSrcIn, MEDIA_TYPE_ALL);
      aMeta.item.setOutPoint(aSrcIn + aDur, MEDIA_TYPE_ALL);
      seq.audioTracks[aJob.trackIdx].overwriteClip(aMeta.item, aJob.start);
      clearGhosts(seq, aMeta, aJob.start, -1, aJob.trackIdx);
      replaced++;
      log.push("A" + (aJob.trackIdx + 1) + " " + formatShort(aJob.start) + "-" + formatShort(aJob.end) + "  '" + aJob.name + "' -> '" + aMeta.name + "'");
    } catch (eA) {
      log.push("Skipped '" + aJob.name + "': " + errorMessage(eA));
    }
  }

  for (i = 0; i < pool.length; i++) {
    try {
      pool[i].item.clearInPoint(MEDIA_TYPE_ALL);
      pool[i].item.clearOutPoint(MEDIA_TYPE_ALL);
    } catch (eClear) {}
  }

  return {
    log: log,
    summary: {
      placed: replaced,
      videoTracksUsed: uniqueCount(paired.video, "trackIdx"),
      audioTracksUsed: paired.audio.length,
      zoneFillPercent: 100
    }
  };
}
