import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from 'nativescript-angular/router';
import { Subscription } from 'rxjs';
import { Demo } from '../../models';

@Component({
  selector: 'journey-detail',
  moduleId: module.id,
  templateUrl: './journey-detail.component.html'
})
export class JourneyDetailComponent implements OnInit {
  item: Demo;
  subscription: Subscription;

  constructor(
    private _route: ActivatedRoute,
    private _routerExtension: RouterExtensions,
    private _activeRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.subscription = this._route.params.subscribe(params => {
      const id = +params['id'];
      // get the journey data using the `id` of the record
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  back() {
    this._routerExtension.back();
  }

  backByOutlet() {
    this._routerExtension.back({ outlets: ['primary'] });
  }

  backByParentRoute() {
    this._routerExtension.back({ relativeTo: this._activeRoute.parent });
  }

  backByActivatedRoute() {
    this._routerExtension.back({ relativeTo: this._activeRoute });
  }
}
