/* The ONE place for the App Store link. Everything else (the page buttons, /get/) is built from these two values.
   - appStoreId: Catbeam's Apple ID (App Store Connect, `ASC 6819641536` in docs/SUBMISSION-1.0.1.md).
   - providerToken: the Apple "pt=" provider token of the developer account (App Store Connect → Analytics → Campaigns,
     the same value Interval Walk's links carry). same team's other app campaign links use it; to change, edit here and run
     `python3 scripts/site/build.py` so the static buttons pick it up. Empty = links work, but installs are not attributed. */
window.CATBEAM = {
  appStoreId: '6819641536',
  providerToken: '128439797',
  host: 'erengn-ops.github.io'
};
window.CATBEAM.storeUrl = function (campaign) {
  var c = window.CATBEAM, q = [];
  if (c.providerToken) q.push('pt=' + encodeURIComponent(c.providerToken));
  q.push('ct=' + encodeURIComponent(campaign || 'web'), 'mt=8');
  return 'https://apps.apple.com/app/apple-store/id' + c.appStoreId + '?' + q.join('&');
};
