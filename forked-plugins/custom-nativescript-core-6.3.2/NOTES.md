# Document local changes here to update in future

1. ui/core/view/view.android.js (line 99)

- Adds guard to ensure the options is not null before creating dialogs. Related to crashes in Sentry with the `onStart` of the custom activity being called. Could be a fluke timing issue, not 100% of root cause.

```javascript
console.log('onCreateDialog ownerId:' + ownerId);
var options = getModalOptions(ownerId);
if (!options) {
  console.log(
    "The options are null for the `onCreateDialog` method so we can't show the dialog"
  );
  return;
}
```

2. ui/core/view/view.android.js (line 117)

- Adds a custom android THEME to modals for allowing WearOS swipe back UX

```javascript
var swipeTheme = com.permobil.smartdrive.wearos.R.style.SwipeableActivityTheme; // line ~28
if (this._cancelable) {
  // for swipe dismiss modals on WearOS apps
  theme = swipeTheme;
} else if (this._fullscreen) {
  theme = this.getActivity().getApplicationInfo().theme;
}
```
