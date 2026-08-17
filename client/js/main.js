(function () {
  "use strict";

  const cs = new CSInterface();
  const state = { bins: [], videoTracks: [], audioTracks: [], hasActiveSequence: false, clipWeights: {} };
  let busy = false;
  let logBuffer = [];
  let evalConditionals = () => {};
  const RUN_BATCH_SIZE = 200;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    AP_I18N.apply(AP_I18N.initial());
    wireLangButtons();
    wireTabs();
    wireConditionalFields();
    wireAudioProbabilityOutput();
    wireReroll();
    wireCollapsible();
    loadSettings();
    initWeightsModal();

    document.getElementById("refreshBtn").addEventListener("click", refresh);
    document.getElementById("runBtn").addEventListener("click", runNow);
    document.getElementById("runNarratorBtn").addEventListener("click", runNarrator);
    document.getElementById("replaceSelectedBtn").addEventListener("click", runReplaceSelected);
    document.getElementById("binSelect").addEventListener("change", renderNarratorSource);

    // Auto-save settings on any input change
    document.body.addEventListener("change", saveSettings);
    document.body.addEventListener("input", saveSettings);

    applyHostTheme();
    cs.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, applyHostTheme);

    setVersionLine();
    refresh();
  }

  // ---------- one-time wiring ----------

  function wireLangButtons() {
    document.getElementById("langEn").addEventListener("click", () => switchLang("en"));
    document.getElementById("langRu").addEventListener("click", () => switchLang("ru"));
  }

  function switchLang(lang) {
    AP_I18N.apply(lang);
    setVersionLine();
    renderBinOptions();
  }

  function wireTabs() {
    const btns = Array.from(document.querySelectorAll(".tab-btn"));
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.toggle("active", b === btn));
        const tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab-panel").forEach((panel) => {
          panel.classList.toggle("hidden", panel.getAttribute("data-tab-panel") !== tab);
        });
      });
    });
  }

  function wireConditionalFields() {
    const condEls = Array.from(document.querySelectorAll("[data-show-if]"));
    const groupNames = new Set(condEls.map((el) => el.getAttribute("data-show-if").split("=")[0]));

    evalConditionals = function () {
      condEls.forEach((el) => {
        const [name, valStr] = el.getAttribute("data-show-if").split("=");
        const vals = valStr.split(",");
        
        let currentVal = null;
        const selectEl = document.getElementById(name);
        if (selectEl && selectEl.tagName === "SELECT") {
          currentVal = selectEl.value;
        } else {
          const checked = document.querySelector(`input[name="${name}"]:checked`);
          if (checked) currentVal = checked.value;
        }
        
        el.classList.toggle("hidden", !vals.includes(currentVal));
      });
    };

    groupNames.forEach((name) => {
      const selectEl = document.getElementById(name);
      if (selectEl && selectEl.tagName === "SELECT") {
        selectEl.addEventListener("change", evalConditionals);
      } else {
        document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
          radio.addEventListener("change", evalConditionals);
        });
      }
    });

    evalConditionals();
  }

  function wireAudioProbabilityOutput() {
    wireRangeOutput("audioProbability", "audioProbabilityOut");
    wireRangeOutput("fillPercentValue", "fillPercentOut");
  }

  function wireRangeOutput(rangeId, outId) {
    const range = document.getElementById(rangeId);
    const out = document.getElementById(outId);
    if (!range || !out) return;
    const sync = () => { out.textContent = range.value + "%"; };
    range.addEventListener("input", sync);
    sync();
  }

  function wireReroll() {
    document.getElementById("rerollBtn").addEventListener("click", () => {
      document.getElementById("seedValue").value = Math.floor(Math.random() * 1000000);
      setRadioValue("conflictMode", "replace");
      saveSettings();
      runNow();
    });
  }

  function wireCollapsible() {
    document.querySelectorAll(".card h2").forEach(h2 => {
      h2.addEventListener("click", () => {
        h2.parentElement.classList.toggle("collapsed");
        saveSettings();
      });
    });
  }

  function saveSettings() {
    const data = {};
    document.querySelectorAll("select, input[type='text'], input[type='number'], input[type='range']").forEach(el => {
      if (el.id) data[el.id] = el.value;
    });
    document.querySelectorAll("input[type='checkbox']").forEach(el => {
      if (el.id) data[el.id] = el.checked;
    });
    const collapsed = [];
    document.querySelectorAll(".card").forEach((card, idx) => {
      if (card.classList.contains("collapsed")) collapsed.push(idx);
    });
    data._collapsed = collapsed;
    data.clipWeights = state.clipWeights;
    try { window.localStorage.setItem("ap_settings", JSON.stringify(data)); } catch(e) {}
  }

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem("ap_settings");
      if (!raw) return;
      const data = JSON.parse(raw);
      document.querySelectorAll("select, input[type='text'], input[type='number'], input[type='range']").forEach(el => {
        if (el.id && data[el.id] !== undefined) el.value = data[el.id];
      });
      document.querySelectorAll("input[type='checkbox']").forEach(el => {
        if (el.id && data[el.id] !== undefined) el.checked = data[el.id];
      });
      if (data._collapsed) {
        document.querySelectorAll(".card").forEach((card, idx) => {
          if (data._collapsed.includes(idx)) card.classList.add("collapsed");
        });
      }
      if (data.clipWeights) {
        state.clipWeights = data.clipWeights;
      }
    } catch(e) {}
  }

  function initWeightsModal() {
    const openBtn = document.getElementById("openWeightsBtn");
    const closeBtn = document.getElementById("weightsCloseBtn");
    const resetBtn = document.getElementById("weightsResetBtn");
    const modal = document.getElementById("weightsModal");
    const list = document.getElementById("weightsList");

    if (!openBtn || !modal) return;

    openBtn.addEventListener("click", () => {
      const binId = document.getElementById("binSelect").value;
      if (!binId) return;
      
      list.innerHTML = "<div style='padding: 10px; text-align: center; color: var(--text-dim);'>Loading...</div>";
      modal.classList.remove("hidden");

      callHost("AP_getBinClips", { binId: binId, recursive: document.getElementById("binRecursive").checked }).then((res) => {
        list.innerHTML = "";
        if (res && res.ok && res.clips && res.clips.length > 0) {
          res.clips.forEach(c => {
            const row = document.createElement("div");
            row.className = "weight-item";
            
            const nameEl = document.createElement("div");
            nameEl.className = "weight-name";
            nameEl.textContent = c.name;
            nameEl.title = c.name;
            
            const ctrl = document.createElement("div");
            ctrl.className = "weight-controls";
            
            const slider = document.createElement("input");
            slider.type = "range";
            slider.className = "weight-slider";
            slider.min = "0";
            slider.max = "5";
            slider.step = "0.1";
            slider.value = state.clipWeights[c.id] !== undefined ? state.clipWeights[c.id] : 1.0;
            
            const valOut = document.createElement("div");
            valOut.className = "weight-val";
            valOut.textContent = Number(slider.value).toFixed(1) + "x";
            
            slider.addEventListener("input", (e) => {
              valOut.textContent = Number(e.target.value).toFixed(1) + "x";
              state.clipWeights[c.id] = parseFloat(e.target.value);
              saveSettings();
            });
            
            ctrl.appendChild(slider);
            ctrl.appendChild(valOut);
            
            row.appendChild(nameEl);
            row.appendChild(ctrl);
            list.appendChild(row);
          });
        } else {
          list.innerHTML = "<div style='padding: 10px; text-align: center; color: var(--text-dim);'>No usable clips found.</div>";
        }
      });
    });

    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
    
    resetBtn.addEventListener("click", () => {
      state.clipWeights = {};
      saveSettings();
      modal.classList.add("hidden");
    });
  }

  // ---------- host bridge ----------

  function callHost(fnName, argObj) {
    return new Promise((resolve) => {
      let script;
      if (argObj === undefined) {
        script = `${fnName}()`;
      } else {
        script = `${fnName}(${JSON.stringify(JSON.stringify(argObj))})`;
      }
      cs.evalScript(script, (raw) => {
        if (raw === "__NO_CEP__") {
          resolve({ ok: false, error: AP_I18N.t("run.noCepBridge") });
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve({ ok: false, error: String(raw) });
        }
      });
    });
  }

  // ---------- theme ----------

  function applyHostTheme() {
    const env = cs.hostEnvironment();
    if (!env || !env.appSkinInfo) return;
    const skin = env.appSkinInfo;
    const bg = colorToCss(skin.panelBackgroundColor && skin.panelBackgroundColor.color);
    const accent = colorToCss(skin.systemHighlightColor && skin.systemHighlightColor.color);
    if (bg) document.documentElement.style.setProperty("--bg-app", bg);
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }

  function colorToCss(c) {
    if (!c) return null;
    const norm = (v) => (v == null ? 0 : v <= 1 ? Math.round(v * 255) : Math.round(v));
    return `rgb(${norm(c.red)}, ${norm(c.green)}, ${norm(c.blue)})`;
  }

  function setVersionLine() {
    const env = cs.hostEnvironment();
    const el = document.getElementById("appVersionLine");
    const base = AP_I18N.t("app.versionLine");
    el.textContent = env && env.appVersion ? `${base} · PPRO ${env.appVersion}` : base;
  }

  // ---------- project state / refresh ----------

  function canRun() {
    return state.hasActiveSequence;
  }

  function refresh() {
    setStatus("", null);
    
    callHost("AP_getProjectInfo").then((result) => {
      if (!result || result.ok === false) {
        state.hasActiveSequence = false;
        showNoSequence(true, result ? result.error : AP_I18N.t("run.noCepBridge"));
        setRunningUI(false);
        return;
      }

      state.bins = result.bins || [];
      state.videoTracks = result.videoTracks || [];
      state.audioTracks = result.audioTracks || [];
      state.hasActiveSequence = !!result.hasActiveSequence;

      showNoSequence(!state.hasActiveSequence);
      renderBinOptions();
      clearLog();
      appendLog(["DEBUG_BINS_LENGTH: " + state.bins.length]);
      appendLog(["DEBUG_BINS_JSON: " + JSON.stringify(state.bins)]);
      renderNarratorSource();
      setRunningUI(false);
    });
  }

  // Populates the "Fill narrator gaps from" picker with the individual clips
  // of the currently selected bin, so the user can target one specific video
  // instead of the whole-bin random pool. Keeps "All bin clips (random)" as
  // the first option and preserves the current choice across refreshes.
  function renderNarratorSource() {
    const sel = document.getElementById("narratorSource");
    if (!sel) return;
    const binId = document.getElementById("binSelect").value;
    const previous = sel.value;

    if (!binId) {
      sel.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "all";
      opt.textContent = AP_I18N.t("narrator.source.all");
      sel.appendChild(opt);
      return;
    }

    callHost("AP_getBinClips", { binId: binId, recursive: document.getElementById("binRecursive").checked }).then((res) => {
      sel.innerHTML = "";
      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = AP_I18N.t("narrator.source.all");
      sel.appendChild(allOpt);

      if (res && res.ok && res.clips) {
        res.clips.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.name;
          sel.appendChild(opt);
        });
      }
      sel.value = previous || "all";
      if (!sel.value) sel.value = "all";
    });
  }

  function showNoSequence(show, customMsg) {
    const el = document.getElementById("noSequenceWarning");
    el.textContent = customMsg || AP_I18N.t("source.noSequence.warning");
    el.classList.toggle("hidden", !show);
  }

  function renderBinOptions() {
    const sel = document.getElementById("binSelect");
    const previous = sel.value;
    sel.innerHTML = "";

    if (!state.bins.length) {
      const opt = document.createElement("option");
      opt.textContent = AP_I18N.t("source.bin.optionNone");
      opt.value = "";
      sel.appendChild(opt);
      return;
    }

    let preselect = null;
    state.bins.forEach((bin) => {
      const opt = document.createElement("option");
      opt.value = bin.id;
      opt.textContent = `${bin.path} (${bin.clipCount})`;
      sel.appendChild(opt);
      if (bin.id === previous) preselect = bin.id;
      if (!preselect && bin.name && bin.name.toLowerCase() === "content") preselect = bin.id;
    });
    sel.value = preselect || state.bins[0].id;
  }


  function setRadioValue(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }



  // ---------- validation ----------

  function audioCouldBeUsed() {
    const mode = document.getElementById("audioMode").value;
    if (mode === "global") return document.getElementById("audioIncludeGlobal").checked;
    if (mode === "randomize") return parseFloat(document.getElementById("audioProbability").value) > 0;
    return true; // mutedlink: audio is always placed, just possibly muted
  }

  function validate() {
    const min = parseFloat(document.getElementById("minSec").value);
    const max = parseFloat(document.getElementById("maxSec").value);
    if (min > max) return AP_I18N.t("run.validate.minMax");
    return null;
  }

  // ---------- run ----------

  function parseIgnoreString(str) {
    if (!str) return [];
    return str.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1)
      .map(n => n - 1);
  }

  function collectParams() {
    return {
      bin: {
        id: document.getElementById("binSelect").value,
        recursive: document.getElementById("binRecursive").checked
      },
      zone: {
        mode: document.getElementById("zoneMode").value,
        markerName: document.getElementById("markerName").value || "MAIN"
      },
      cut: {
        mode: document.getElementById("cutMode").value,
        wholeMode: document.getElementById("wholeMode") ? document.getElementById("wholeMode").value : "maxOnly",
        minSec: parseFloat(document.getElementById("minSec").value) || 1,
        maxSec: parseFloat(document.getElementById("maxSec").value) || 10
      },
      fill: {
        mode: document.getElementById("fillMode").value,
        count: parseInt(document.getElementById("fillCountValue").value, 10) || 1,
        percent: parseFloat(document.getElementById("fillPercentValue").value) || 100
      },
      audio: {
        mode: document.getElementById("audioMode").value,
        include: document.getElementById("audioIncludeGlobal").checked,
        probability: parseFloat(document.getElementById("audioProbability").value) / 100
      },
      tracks: {
        conflictMode: document.getElementById("conflictMode").value,
        video: {
          playbackOverlap: document.getElementById("videoPlaybackOverlap").value,
          packing: document.getElementById("videoPacking").value,
          autoCount: parseInt(document.getElementById("videoTrackAutoCount").value, 10) || 1,
          ignore: parseIgnoreString(document.getElementById("videoTracksIgnore").value)
        },
        audio: {
          autoCount: parseInt(document.getElementById("audioTrackAutoCount").value, 10) || 1,
          ignore: parseIgnoreString(document.getElementById("audioTracksIgnore").value)
        }
      },
      extras: {
        seed: parseInt(document.getElementById("seedValue").value, 10) || 1,
        autoSeed: document.getElementById("autoSeed").checked,
        avoidRepeat: parseInt(document.getElementById("avoidRepeat").value, 10) || 0,
        avoidDuplicateSegments: document.getElementById("avoidDuplicateSegments") ? document.getElementById("avoidDuplicateSegments").checked : false,
        segmentPadding: parseFloat(document.getElementById("segmentPadding") ? document.getElementById("segmentPadding").value : 5) || 0,
        addMarkers: document.getElementById("addMarkers").checked,
        minGapSec: parseFloat(document.getElementById("minGapSec").value) || 0,
        scaleMode: document.getElementById("scaleMode").value
      },
      clipWeights: state.clipWeights
    };
  }

  function setRunningUI(isRunning) {
    busy = isRunning;
    document.getElementById("runBtn").disabled = isRunning || !canRun();
    document.getElementById("refreshBtn").disabled = isRunning;
    document.getElementById("replaceSelectedBtn").disabled = isRunning || !canRun();
    document.getElementById("runNarratorBtn").disabled = isRunning || !canRun();
  }

  function runNow() {
    if (busy) return;
    const err = validate();
    if (err) {
      setStatus(err, "error");
      return;
    }

    if (document.getElementById("autoSeed").checked) {
      const r = Math.floor(Math.random() * 999999) + 1;
      document.getElementById("seedValue").value = r;
      saveSettings();
    }

    setRunningUI(true);
    setStatus(AP_I18N.t("run.running"), "ok");
    clearLog();

    const params = collectParams();
    callHost("AP_runAll", params).then((final) => {
      setRunningUI(false);
      
      if (!final) {
        setStatus("Host returned empty response.", "error");
        return;
      }
      if (final.ok === false) {
        setStatus(AP_I18N.t("run.error.prefix") + final.error, "error");
        return;
      }
      
      if (final.logTail && final.logTail.length) appendLog(final.logTail);
  
      const s = final.summary || {};
      const text = AP_I18N.t("run.summary")
        .replace("{count}", s.placed != null ? s.placed : 0)
        .replace("{video}", s.videoTracksUsed != null ? s.videoTracksUsed : 0)
        .replace("{audio}", s.audioTracksUsed != null ? s.audioTracksUsed : 0)
        .replace("{pct}", s.zoneFillPercent != null ? s.zoneFillPercent : 0);
  
      setStatus(text, "success");
    });
  }

  function runReplaceSelected() {
    if (busy) return;

    setRunningUI(true);
    setStatus(AP_I18N.t("run.running"), "ok");
    clearLog();

    // Deliberately no auto-seed here: the seed only picks WHICH new clips go
    // into the selected slots, and rolling it fresh each click is what makes
    // repeated presses give different rerolls anyway.
    const params = collectParams();
    params.extras.seed = Math.floor(Math.random() * 999999) + 1;

    callHost("AP_replaceSelected", params).then((final) => {
      setRunningUI(false);

      if (!final) {
        setStatus("Host returned empty response.", "error");
        return;
      }
      if (final.ok === false) {
        setStatus(AP_I18N.t("run.error.prefix") + final.error, "error");
        return;
      }

      if (final.logTail && final.logTail.length) appendLog(final.logTail);

      const s = final.summary || {};
      setStatus(AP_I18N.t("replace.summary").replace("{count}", s.placed != null ? s.placed : 0), "success");
    });
  }

  function runNarrator() {
    if (busy) return;
    const err = validate();
    if (err) {
      setStatus(err, "error");
      return;
    }

    if (document.getElementById("autoSeed").checked) {
      const r = Math.floor(Math.random() * 999999) + 1;
      document.getElementById("seedValue").value = r;
      saveSettings();
    }

    setRunningUI(true);
    document.getElementById("runNarratorBtn").disabled = true;
    setStatus(AP_I18N.t("run.running"), "ok");
    clearLog();

    const params = collectParams();
    params.narratorMode = true;
    params.narratorAudioTrack = parseInt(document.getElementById("narratorAudioTrack").value, 10) || 1;
    params.narratorVideoTrack = parseInt(document.getElementById("narratorVideoTrack").value, 10) || 2;
    params.narratorSourceId = document.getElementById("narratorSource").value || "all";
    params.pullSubtitles = document.getElementById("pullSubtitles") ? document.getElementById("pullSubtitles").checked : false;

    callHost("AP_fillNarratorGaps", params).then((final) => {
      setRunningUI(false);
      document.getElementById("runNarratorBtn").disabled = false;
      
      if (!final) {
        setStatus("Host returned empty response.", "error");
        return;
      }
      if (final.ok === false) {
        setStatus(AP_I18N.t("run.error.prefix") + final.error, "error");
        return;
      }
      
      if (final.logTail && final.logTail.length) appendLog(final.logTail);
  
      const s = final.summary || {};
      const text = AP_I18N.t("run.summary")
        .replace("{count}", s.placed != null ? s.placed : 0)
        .replace("{video}", s.videoTracksUsed != null ? s.videoTracksUsed : 0)
        .replace("{audio}", s.audioTracksUsed != null ? s.audioTracksUsed : 0)
        .replace("{pct}", s.zoneFillPercent != null ? s.zoneFillPercent : 0);
  
      setStatus(text, "success");
    });
  }

  // ---------- status / log ----------

  function setStatus(text, kind) {
    const el = document.getElementById("statusLine");
    el.textContent = text;
    el.className = "status-line" + (kind ? " " + kind : "") + (text ? "" : " hidden");
  }

  function appendLog(lines) {
    // Disabled as requested by user
  }

  function clearLog() {
    // Disabled as requested by user
  }
})();
