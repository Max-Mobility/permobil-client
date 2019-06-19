import { View } from 'tns-core-modules/ui/core/view';

export function hideOffScreenLayout(
  view: View,
  position: { x: number; y: number }
) {
  return new Promise((resolve, reject) => {
    if (view) {
      view.visibility = 'collapse';
      view
        .animate({
          target: view,
          duration: 300,
          translate: {
            x: position.x,
            y: position.y
          }
        })
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

export function showOffScreenLayout(view: View) {
  return new Promise((resolve, reject) => {
    if (view) {
      view.visibility = 'visible';
      view
        .animate({
          target: view,
          duration: 300,
          translate: {
            x: 0,
            y: 0
          }
        })
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}
