import { Component, Input, NgZone } from '@angular/core';
import { BluetoothService, PushTrackerState } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Feedback } from 'nativescript-feedback';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import { ActionBar } from 'tns-core-modules/ui/action-bar';

@Component({
  selector: 'MaxActionBar',
  moduleId: module.id,
  templateUrl: 'actionbar.component.html',
  styleUrls: ['actionbar.component.scss']
})
export class ActionbarComponent extends ActionBar {
  @Input() title: string;
  @Input() allowNav = true;

  // keep track of the overall pushtracker state
  status = PushTrackerState.unknown;
  imgSrc = '~/assets/images/pt_conn_red.png';

  // use feedback to tell the user about the current state / connected pushtrackers
  private _feedback: Feedback;

  constructor(
    private _zone: NgZone,
    private _translateService: TranslateService
  ) {
    super();

    this._feedback = new Feedback();
    this.onPushTrackerStateChange(null);
    this.register();
  }

  onPTConnTap(): void {
    if (this.status === PushTrackerState.paired) {
      this._feedback.info({
        backgroundColor: new Color('#004f7e'),
        icon: 'pt_conn_grey',
        android: {
          iconColor: new Color('#a7aaa2')
        },
        title: this._translateService.instant('pushtracker.state.paired.title'),
        message: this._translateService.instant('pushtracker.state.paired.msg'),
        duration: 5000,
        onTap: () => {
          // feedback tapped, do nothing
        }
      });
    } else if (this.status === PushTrackerState.disconnected) {
      this._feedback.info({
        backgroundColor: new Color('#004f7e'),
        icon: 'pt_conn_grey',
        android: {
          iconColor: new Color('#a7aaa2')
        },
        title: this._translateService.instant(
          'pushtracker.state.disconnected.title'
        ),
        message: this._translateService.instant(
          'pushtracker.state.disconnected.msg'
        ),
        duration: 5000,
        onTap: () => {
          // feedback tapped, do nothing
        }
      });
    } else if (this.status === PushTrackerState.connected) {
      this._feedback.info({
        backgroundColor: new Color('#004f7e'),
        icon: 'pt_conn_yellow',
        android: {
          iconColor: new Color('#f8e31c')
        },
        title: this._translateService.instant(
          'pushtracker.state.connecting.title'
        ),
        message: this._translateService.instant(
          'pushtracker.state.connecting.msg'
        ),
        duration: 5000,
        onTap: () => {
          // feedback tapped, do nothing
        }
      });
    } else if (this.status === PushTrackerState.ready) {
      let s = '\n';
      BluetoothService.PushTrackers.map(pt => {
        if (pt.connected) {
          s += pt.status() + '\n';
        }
      });
      this._feedback.info({
        backgroundColor: new Color('#004f7e'),
        icon: 'pt_conn_green',
        android: {
          iconColor: new Color('#00a651')
        },
        title: this._translateService.instant(
          'pushtracker.state.connected.title'
        ),
        message:
          this._translateService.instant('pushtracker.state.connected.msg') + s, // add connected PTs info
        duration: 5000,
        onTap: () => {
          // feedback tapped, do nothing
        }
      });
    } else {
      this._feedback.info({
        backgroundColor: new Color('#004f7e'),
        icon: 'pt_conn_red',
        android: {
          iconColor: new Color('#ed1c24')
        },
        title: this._translateService.instant(
          'pushtracker.state.unknown.title'
        ),
        message: this._translateService.instant(
          'pushtracker.state.unknown.msg'
        ),
        duration: 5000,
        onTap: () => {
          // feedback tapped, do nothing
        }
      });
    }
  }

  onPushTrackerStateChange(args: any) {
    this._zone.run(() => {
      this.status = BluetoothService.pushTrackerStatus.get('state');
      if (this.status === PushTrackerState.unknown) {
        this.imgSrc = '~/assets/images/pt_conn_red.png';
      } else if (
        this.status === PushTrackerState.paired ||
        this.status === PushTrackerState.disconnected
      ) {
        this.imgSrc = '~/assets/images/pt_conn_grey.png';
      } else if (this.status === PushTrackerState.connected) {
        this.imgSrc = '~/assets/images/pt_conn_yellow.png';
      } else if (this.status === PushTrackerState.ready) {
        this.imgSrc = '~/assets/images/pt_conn_green.png';
      } else {
        this.imgSrc = '~/assets/Images/pt_conn_red.png';
      }
    });
  }

  unregister(): void {
    BluetoothService.pushTrackerStatus.removeEventListener(
      Observable.propertyChangeEvent,
      this.onPushTrackerStateChange
    );
  }

  register(): void {
    // this.unregister();
    BluetoothService.pushTrackerStatus.addEventListener(
      Observable.propertyChangeEvent,
      this.onPushTrackerStateChange,
      this
    );
  }
}
