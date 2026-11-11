(function () {
  var params = new URLSearchParams(window.location.search);
  var flow = params.get("flow");
  var oauthError = params.get("error") || params.get("oauth_error");
  var title = document.getElementById("title");
  var message = document.getElementById("message");
  var payload = {
    type: "aevora:google-auth-result",
    flow: flow,
    status: oauthError ? "error" : "success",
    error: oauthError ? "Google sign-in did not complete. Please try again." : null
  };

  if (!flow) {
    title.textContent = "Cannot finish sign-in";
    message.textContent = "The sign-in request is missing. Close this window and start again from Aevora.";
    return;
  }

  // Google may sever window.opener with a cross-origin opener policy.
  // BroadcastChannel and storage events still work once back on localhost.
  try { if (window.opener) window.opener.postMessage(payload, window.location.origin); } catch (_) {}
  try {
    if (typeof BroadcastChannel !== "undefined") {
      var channel = new BroadcastChannel("aevora-google-auth");
      channel.postMessage(payload);
      channel.close();
    }
  } catch (_) {}
  try { localStorage.setItem("aevora:google-auth:" + flow, JSON.stringify(payload)); } catch (_) {}

  title.textContent = oauthError ? "Google sign-in failed" : "Google sign-in complete";
  message.textContent = oauthError
    ? "Return to Aevora and try again. You can close this window."
    : "You can return to Aevora. This window will close automatically.";
  if (!oauthError) setTimeout(function () { window.close(); }, 600);
}());
