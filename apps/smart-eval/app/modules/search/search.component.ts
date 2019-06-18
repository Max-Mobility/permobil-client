import { Component } from '@angular/core';

@Component({
  selector: 'search',
  moduleId: module.id,
  templateUrl: 'search.component.html',
  styles: [
    `
      image {
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
        height: auto;
      }

      .slide-indicator-inactive {
        background-color: #fff;
        opacity: 0.4;
        width: 10;
        height: 10;
        margin-left: 2.5;
        margin-right: 2.5;
        margin-top: 0;
        border-radius: 5;
      }

      .slide-indicator-active {
        background-color: #fff;
        opacity: 0.9;
        width: 10;
        height: 10;
        margin-left: 2.5;
        margin-right: 2.5;
        margin-top: 0;
        border-radius: 5;
      }
    `
  ]
})
export class SearchComponent {
  slides = [
    {
      Image: '~/assets/images/PowerOn.jpg',
      Label: 'Powering SmartDrive',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/BandPower.jpg',
      Label: 'Powering PushTracker',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/Tapping.jpg',
      Label: 'Tap Gesture',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/Steer.jpg',
      Label: 'Steering',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/turn.jpg',
      Label: 'Turning',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/Stop.jpg',
      Label: 'Stopping',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    },
    {
      Image: '~/assets/images/Stop2.jpg',
      Label: 'More Stopping',
      Description:
        'It is important to learn how to do a proper tapping technique.'
    }
  ];
}
