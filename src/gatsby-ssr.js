import React from "react";

exports.onRenderBody = ({ setHeadComponents }, pluginOptions) => {
  const {
    trackPage,
    prodKey,
    devKey,
    dataPlaneUrl = "https://hosted.rudderlabs.com",
    controlPlaneUrl,
    delayLoad,
    delayLoadTime,
    manualLoad,
    loadType,
    srcUrl
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

  // if trackPage option is falsy (undefined or false), remove rudderanalytics.page(), else keep it in by default
  // NOTE: do not remove. This is used in gatsby-browser. per https://github.com/benjaminhoffman/gatsby-plugin-segment-js/pull/18
  const includeTrackPage = !trackPage ? "" : "rudderanalytics.page();";

  const loadConfig = controlPlaneUrl
    ? `'${writeKey}', '${dataPlaneUrl}', {configUrl: '${controlPlaneUrl}'}`
    : `'${writeKey}', '${dataPlaneUrl}'`;
  /*
    if (controlPlaneUrl) {
      return `'${writeKey}', '${dataPlaneUrl}', {configUrl: '${controlPlaneUrl}'}`;
    } else {
      return `'${writeKey}', '${dataPlaneUrl}'`;
    }
  }; */

  const snippet = `rudderanalytics=window.rudderanalytics=[];for(var methods=["load","page","track","identify","alias","group","ready","reset","getAnonymousId","setAnonymousId"],i=0;i<methods.length;i++){var method=methods[i];rudderanalytics[method]=function(a){return function(){rudderanalytics.push([a].concat(Array.prototype.slice.call(arguments)))}}(method)}
  ${delayLoad || manualLoad ? `` : `rudderanalytics.load(${loadConfig})`};
`;

  const delayedLoader = `
      window.rudderSnippetLoaded = false;
      window.rudderSnippetLoading = false;
      window.rudderSnippetLoader = function (callback) {
        if (!window.rudderSnippetLoaded && !window.rudderSnippetLoading) {
          window.rudderSnippetLoading = true;
          function loader() {
            window.rudderanalytics.load(${loadConfig});
            window.rudderSnippetLoading = false;
            window.rudderSnippetLoaded = true;
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
      window.addEventListener('scroll',function () {window.rudderSnippetLoader()}, { once: true });
    `;

  // if `delayLoad` option is true, use the delayed loader
  const snippetToUse = `
      ${delayLoad && !manualLoad ? delayedLoader : ""}
      ${snippet}
    `;

  // only render snippet if write key exists
  if (writeKey) {
    let tags = [
      <script
        key="plugin-rudderstack"
        dangerouslySetInnerHTML={{ __html: snippetToUse }}
      />
    ]

    let tag;

    if (loadType == 'async') {
      tag = <script async
        key="rudderstack-cdn"
        src={srcUrl || 'https://cdn.rudderlabs.com/v1/rudder-analytics.min.js'}
      ></script>
    } else if (loadType == 'defer') {
      tag = <script defer
        key="rudderstack-cdn"
        src={srcUrl || 'https://cdn.rudderlabs.com/v1/rudder-analytics.min.js'}
      ></script>
    } else {
      tag = <script
        key="rudderstack-cdn"
        src={srcUrl || 'https://cdn.rudderlabs.com/v1/rudder-analytics.min.js'}
    ></script>
    }

    tags.push(tag)
    setHeadComponents(tags);
  }
};
