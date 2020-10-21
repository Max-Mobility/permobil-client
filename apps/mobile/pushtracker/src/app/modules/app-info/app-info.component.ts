import { Component, OnInit } from '@angular/core';
import { ModalDialogParams } from '@nativescript/angular';
import { TranslateService } from '@ngx-translate/core';
import { LoggingService } from '../../services';
import { LottieView } from 'nativescript-lottie';

@Component({
  selector: 'app-info',
  moduleId: module.id,
  templateUrl: 'app-info.component.html'
})
export class AppInfoComponent implements OnInit {
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(AppInfoComponent.name, 'OnInit');
    const sections = this._translateService.instant(
      'app-info-component.sections'
    );
    if (sections.length) {
      this.infoItems = sections;
    } else {
      this.infoItems = Object.values(sections);
    }
  }

  lottieLoaded(event, item) {
    console.log(event.object);
    // set the lottie src if we have it for the item
    if (item.lottie) {
      const lottieView = event.object as LottieView;
      lottieView.src = item.lottie;
    }
  }

  closeModal() {
    this._params.closeCallback();
  }
}
