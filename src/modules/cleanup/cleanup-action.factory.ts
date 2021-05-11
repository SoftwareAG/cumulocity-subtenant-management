import { Injectable } from '@angular/core';
import { ActionFactory, Action, AlertService } from '@c8y/ngx-components';
import { Router } from '@angular/router';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable()
export class CleanupActionFactory implements ActionFactory {
  action: Action;
  constructor(
    private router: Router,
    private credService: FakeMicroserviceService,
    private alertService: AlertService
  ) {
    this.action = {
      label: 'Cleanup subscriptions',
      action: () => {
        console.log('Custom action');
        this.router.navigate(['/']);
        this.credService.cleanup().then(
          () => {
            this.alertService.success('Cleaned up subscriptions.');
          },
          (error) => {
            this.alertService.warning('Failed to cleanup subscriptions.', JSON.stringify(error));
          }
        );
      },
      priority: 1,
      icon: 'eraser'
    };
  }

  get(): Action {
    return this.action;
  }
}
