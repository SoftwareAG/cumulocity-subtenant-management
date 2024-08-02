import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validator,
  Validators
} from '@angular/forms';
import { IOperation } from '../../models/operation.model';
import { isEmpty } from 'lodash-es';
import { Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Component({
  selector: 'inet-operation-scheduler',
  templateUrl: 'operation-scheduler.component.html'
})
export class OperationSchedulerComponent implements ControlValueAccessor, Validator, OnInit {
  operationTitle: string = 'Firmware Upgrade';

  @Input()
  operationDescription: string = 'Firmware Upgrade Description';

  @Input()
  operationFormName: string = 'Firmware Upgrade';

  @Input()
  operationFormDescription: string = 'Firmware Upgrade Description';

  @Output() onOperationUpdate: EventEmitter<IOperation> = new EventEmitter<IOperation>();

  operationForm: FormGroup;
  minDate: Date;
  minDelay: number;
  delayErrors: ValidationErrors = null;
  pickerErrors: ValidationErrors = null;

  private readonly DELAY_SECONDS_DEFAULT: number = 1;
  private readonly DELAY_MILLISECONDS_DEFAULT: number = 1;
  private readonly MINUTES_AHEAD_DEFAULT: number = 5;
  private delaySeconds: number = this.DELAY_SECONDS_DEFAULT;
  private delayMilliseconds: number = this.DELAY_MILLISECONDS_DEFAULT;
  private minutesAhead: number = this.MINUTES_AHEAD_DEFAULT;
  private initialDate: Date;
  private delayInSeconds: number;
  private currentUnit: string = 'seconds';
  private subscription: Subscription;

  private onChange: (name) => void;
  private onTouched: () => void;
  private onValidatorChanged: () => void;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges() {
    if (this.operationFormName) {
      this.operationForm.patchValue({
        name: this.operationFormName
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  initForm() {
    this.operationForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      date: ['', Validators.required],
      time: ['', [Validators.required, this.timeValidation]],
      delay: ['', [Validators.required, Validators.min(this.minDelay)]]
    });

    this.minDate = new Date();
    this.initialDate = new Date(this.minDate.setMinutes(this.minDate.getMinutes() + this.minutesAhead));
    this.minDelay = this.delaySeconds;

    this.operationForm.patchValue({
      name: this.operationFormName,
      date: this.initialDate,
      time: this.initialDate,
      delay: this.delaySeconds
    });

    // Due to the validation of picker and time it could be possible that value changes
    // are emitted more than once. Therefore we throttle the emits.
    const valueChanges$ = this.operationForm.valueChanges.pipe(throttleTime(100));
    this.subscription = valueChanges$.subscribe((data) => {
      this.delayErrors = this.operationForm.controls.delay.errors;
      this.pickerErrors = this.operationForm.controls.date.errors;
      this.convertDelayHandler(data.unit);
      this.emitData(data);
    });
  }

  emitData(data: {
    name: string;
    description: string;
    delayInSeconds: number;
    date: Date;
    time?: Date;
    delay?: number;
  }) {
    if (this.onValidatorChanged) {
      this.onValidatorChanged();
    }

    if (data.date && data.time) {
      data.date = this.combineDateAndTime(data.date, data.time);
    }

    this.convertDelay(this.currentUnit);
    data.delayInSeconds = this.delayInSeconds;

    if (this.operationForm.valid) {
      const operation: IOperation = {
        name: data.name,
        description: data.description,
        delay: data.delay,
        date: data.date
      };
      this.onOperationUpdate.emit(operation);
    }
  }

  markAsTouched(): void {
    if (this.onTouched) {
      this.onTouched();
    }
  }

  writeValue(value: any): void {
    if (value) {
      this.operationForm.patchValue({
        date: value.scheduledDate,
        time: value.scheduledDate,
        delay: value.delayInSeconds > 1 ? value.delayInSeconds : value.delayInSeconds * 1000,
        unit: value.delayInSeconds > 1 ? 'seconds' : 'milliseconds'
      });
    }
  }

  validate(): ValidationErrors {
    if (this.operationForm.invalid) {
      return {
        ...this.operationForm.controls.name.errors,
        ...this.operationForm.controls.date.errors,
        ...this.operationForm.controls.time.errors,
        ...this.operationForm.controls.delay.errors
      };
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChanged = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.operationForm.disable() : this.operationForm.enable();
  }

  convertDelayHandler(unit: string) {
    if (this.currentUnit === unit) {
      return;
    }

    this.currentUnit = unit;
    this.convertDelay(this.currentUnit);

    // update validator on delay control to make sure that
    // switching from minutes to seconds or vice versa does not harm validation.
    this.operationForm.controls.delay.setValidators([Validators.required]);
    this.operationForm.controls.delay.updateValueAndValidity();
  }

  private convertDelay(unit: string) {
    if (unit && this.operationForm.controls.delay.value) {
      this.delayMilliseconds = this.operationForm.controls.delay.value;
      if (unit === 'milliseconds') {
        this.minDelay =
          this.delayMilliseconds > this.DELAY_MILLISECONDS_DEFAULT
            ? this.delayMilliseconds
            : this.DELAY_MILLISECONDS_DEFAULT;
        this.delayInSeconds = this.operationForm.controls.delay.value / 1000;
      } else {
        this.delaySeconds = this.operationForm.controls.delay.value;
        this.minDelay = this.delaySeconds > this.DELAY_SECONDS_DEFAULT ? this.delaySeconds : this.DELAY_SECONDS_DEFAULT;
        this.delayInSeconds = this.operationForm.controls.delay.value;
      }
    }
  }

  private combineDateAndTime(date: Date, time: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
  }

  private dateValidation(fControl: FormControl) {
    if (fControl.value) {
      const date = fControl.value as Date;
      fControl.parent.get('time').setValue(date);
      return date >= new Date()
        ? null
        : {
            dateValidation: true
          };
    }
    return { dateValidation: true };
  }

  private timeValidation(fControl: FormControl) {
    if (fControl.value) {
      const date = fControl.value as Date;
      const result =
        date >= new Date()
          ? null
          : {
              dateValidation: true
            };

      const picker = fControl.parent.get('date');

      if (result) {
        picker.setErrors(result);
        picker.markAsTouched();
        return result;
      }

      if (picker && picker.errors && picker.errors.dateValidation) {
        delete picker.errors.dateValidation;

        if (isEmpty(picker.errors)) {
          picker.setErrors(null);
          return result;
        }

        picker.setErrors(picker.errors);
      }
      return result;
    }
    return { dateValidation: true };
  }
}
