import { Component, Input } from '@angular/core';
import { IRetention } from '@models/retention';
import { Subject } from 'rxjs';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-create-or-edit-retention-rule-modal',
  templateUrl: './create-or-edit-retention-rule-modal.component.html'
})
export class CreateOrEditRetentionRuleModalComponent {
  @Input() rule: IRetention;
  @Input() response: Subject<IRetention>;
  constructor(private bsModalRef: BsModalRef) {}

  onDismiss(event: any): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onSave(event: any): void {
    if (this.response) {
      this.response.next(this.rule);
    }
    this.bsModalRef.hide();
  }

  onDataTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log(select);
    const dataType = select.value;
    this.rule.fragmentType = '*';
    this.rule.type = '*';
    this.rule.dataType = dataType;
  }
}
