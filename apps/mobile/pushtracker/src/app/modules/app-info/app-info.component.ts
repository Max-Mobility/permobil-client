import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { View } from 'tns-core-modules/ui/page/page';
import { LoggingService } from '../../services';

@Component({
  selector: 'app-info',
  moduleId: module.id,
  templateUrl: 'app-info.component.html'
})
export class AppInfoComponent implements OnInit {
  private static LOG_TAG = 'app-info.component ';
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(AppInfoComponent.LOG_TAG + `ngOnInit`);
    this.infoItems = this._translateService.instant(
      'app-info-component.sections'
    );
  }

  onShownModally(args) {
    Log.D('onShownModally fired');
    const p = args.object as View;
    // p.visibility = 'visible';
    // p.animate({
    //   opacity: 1,
    //   translate: {
    //     x: 0,
    //     y: 0
    //   },
    //   duration: 300
    // });
  }

  closeModal(event) {
    Log.D('close modal');
    this._params.closeCallback('return value');
  }
}
