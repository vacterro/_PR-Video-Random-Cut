/*
 * Minimal CEP host bridge.
 * Wraps the native `window.__adobe_cep__` object CEP injects into every
 * extension panel. Only the surface this panel actually uses is exposed
 * (evalScript, host environment/theme info, CSXS event subscription) —
 * intentionally not a full port of Adobe's CSInterface.js.
 */
function CSInterface() {}

CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

CSInterface.prototype.hostEnvironment = function () {
  try {
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
  } catch (e) {
    return null;
  }
};

CSInterface.prototype.evalScript = function (script, callback) {
  if (!callback) callback = function () {};
  if (!window.__adobe_cep__) {
    callback("__NO_CEP__");
    return;
  }
  window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.addEventListener = function (type, listener) {
  if (window.__adobe_cep__) {
    window.__adobe_cep__.addEventListener(type, listener);
  }
};

CSInterface.prototype.getSystemPath = function (pathType) {
  try {
    return window.__adobe_cep__.getSystemPath(pathType);
  } catch (e) {
    return "";
  }
};
