import React from "react";

/* TODO:Update to accept Rudderstack options. */
exports.onRenderBody = ({ setHeadComponents }, pluginOptions) => {
  const {
    trackPage,
    prodKey,
    devKey,
    host = "https://cdn.segment.io",
    delayLoad,
    delayLoadTime,
    manualLoad,
    website = "http://localhost::8000",
  } = pluginOptions;

  // ensures Rudderstack production write key is present
  if (!prodKey || prodKey.length < 10)
    console.error(
      "Your Rudderstack prodKey must be at least 10 char in length."
    );

  // if Rudderstack dev key is present, ensures it is at least 10 characters in length
  if (devKey && devKey.length < 10)
    console.error(
      "If present, your Rudderstack devKey must be at least 10 char in length."
    );

  // use prod write key when in prod env, else use dev write key
  // note below, snippet wont render unless writeKey is truthy
  const writeKey = process.env.NODE_ENV === "production" ? prodKey : devKey;

  // if trackPage option is falsy (undefined or false), remove analytics.page(), else keep it in by default
  // NOTE: do not remove per https://github.com/benjaminhoffman/gatsby-plugin-segment-js/pull/18
  const includeTrackPage = !trackPage ? "" : "analytics.page();";

  /* TODO: update to minified Snippet */
  const snippet = `rudderanalytics = window.rudderanalytics = [];
	
	var  methods = [
		"load",
		"page",
		"track",
		"identify",
		"alias",
		"group",
		"ready",
		"reset",
		"getAnonymousId",
    "setAnonymousId"
	];

	for (var i = 0; i < methods.length; i++) {
  		var method = methods[i];
  		rudderanalytics[method] = function (methodName) {
    			return function () {
      				rudderanalytics.push([methodName].concat(Array.prototype.slice.call(arguments)));
    			};
  			}(method);
	}
  rudderanalytics.load(${writeKey}, ${website});
  rudderanalytics.page();
`;

  /* TODO: Update window.segmentSnippetLoaded to window.rudderstackSnippetLoaded */
  /* TODO: Update window.segmentSnippetLoader()  to window.rudderstackSnippetLoader() */
  const delayedLoader = `
      window.segmentSnippetLoaded = false;
      window.segmentSnippetLoading = false;
      window.segmentSnippetLoader = function (callback) {
        if (!window.segmentSnippetLoaded && !window.segmentSnippetLoading) {
          window.segmentSnippetLoading = true;
          function loader() {
            window.analytics.load('${writeKey}');
            window.segmentSnippetLoading = false;
            window.segmentSnippetLoaded = true;
            if(callback) {callback()}
          };
          setTimeout(
            function () {
              "requestIdleCallback" in window
                ? requestIdleCallback(function () {loader()})
                : loader();
            },
            ${delayLoadTime} || 1000
          );
        }
      }
      window.addEventListener('scroll',function () {window.segmentSnippetLoader()}, { once: true });
    `;

  /*TODO: Ensure Rudderstack has this option. */
  // if `delayLoad` option is true, use the delayed loader
  const snippetToUse = `
      ${delayLoad && !manualLoad ? delayedLoader : ""}
      ${snippet}
    `;

  /*TODO: Ensure this is needed. */
  // only render snippet if write key exists
  if (writeKey) {
    setHeadComponents([
      <script
        key="plugin-segment"
        dangerouslySetInnerHTML={{ __html: snippetToUse }}
      />,
    ]);
  }
};
