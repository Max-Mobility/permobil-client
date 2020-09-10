# Document local changes here to update in future

1. ui/core/view/view.android.ts (line 31)

- Adds a custom android THEME to modals for allowing WearOS swipe back UX

```typescript
// enables us to call the theme in the modal creation (perf++) https://github.com/Max-Mobility/permobil-client/issues/749
const getSwipeTheme = () => {
  if ((com as any).permobil?.smartdrive?.wearos) {
    const styleClass = java.lang.Class.forName(
      'com.permobil.smartdrive.wearos.R$style'
    ); //$ for the inner stuff .id

    const prop = android.util.Property.of(
      styleClass,
      java.lang.Integer.class,
      'SwipeableActivityTheme'
    );

    // for swipe dismiss modals on WearOS apps
    return prop.get(null).intValue();
  } else {
    return null;
  }
};
const swipeTheme = getSwipeTheme();

function perfNow(label: string) {
  console.log(
    `${label ? label + ': ' : ''}${java.lang.System.nanoTime() / 1000000}`
  );
}
```

2. ui/core/view/view.android.ts (line 193)

- Sets the swipe theme for SD.W and changes the modal stretch appearance.

```typescript
let theme = this.getTheme();
if (this._cancelable && swipeTheme !== null) {
  // for swipe dismiss modals on WearOS apps
  theme = swipeTheme;
} else if (this._fullscreen) {
  // In fullscreen mode, get the application's theme.
  theme = this.getActivity().getApplicationInfo().theme;
}

perfNow('newDialog');
const dialog = new DialogImpl(this, this.getActivity(), theme);
perfNow('newDialog');

// do not override alignment unless fullscreen modal will be shown;
// otherwise we might break component-level layout:
// https://github.com/NativeScript/NativeScript/issues/5392
// if (!this._fullscreen && !this._stretched) {
this.owner.horizontalAlignment = 'center';
this.owner.verticalAlignment = 'middle';
// } else {
//   this.owner.horizontalAlignment = 'stretch';
//   this.owner.verticalAlignment = 'stretch';
// }
```
