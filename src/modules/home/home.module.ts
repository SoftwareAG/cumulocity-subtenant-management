import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { CoreModule, gettext, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE, NavigatorNode, Route } from '@c8y/ngx-components';

const translations = new NavigatorNode({
  label: gettext('Home'),
  icon: 'home',
  path: '/home',
  routerLinkExact: false
});

export const navigatorNodes = {
  provide: HOOK_NAVIGATOR_NODES,
  useValue: { get: (): NavigatorNode => translations },
  multi: true
};

@NgModule({
  imports: [CommonModule, CoreModule],
  declarations: [HomeComponent],
  entryComponents: [HomeComponent],
  providers: [
    {
      provide: HOOK_ONCE_ROUTE,
      useValue: [
        {
          path: '',
          redirectTo: 'home',
          pathMatch: 'full'
        },
        {
          path: 'home',
          component: HomeComponent
        }
      ] as Route[],
      multi: true
    },
    navigatorNodes
  ]
})
export class HomeModule {}
