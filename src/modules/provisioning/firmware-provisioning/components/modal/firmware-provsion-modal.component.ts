import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IManagedObject, ITenant } from '@c8y/client';
import { AlertService, C8yStepper, ModalService } from '@c8y/ngx-components';
import { OperationSchedulerComponent } from '../operation-scheduler/operation-scheduler.component';
import { IOperation } from '../../models/operation.model';
import { CdkStep } from '@angular/cdk/stepper';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ProvisioningService } from '@services/provisioning.service';

enum step {
  FIRST = 0,
  SECOND = 1,
  THIRD = 2,
  FOURTH = 3
}

@Component({
  selector: 'inet-firmware-provision-modal',
  templateUrl: 'firmware-provision-modal.component.html'
})
export class FirmwareProvisionModalComponent implements OnInit {
  @Input() firmware: IManagedObject;
  @Input() modalTitle: string = 'Firmware Provisioning';
  @Input() provisionFirmwareObject: boolean;

  @Output() onCancel: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild(C8yStepper, { static: true })
  stepper: C8yStepper;

  formGroupStepOne: FormGroup;
  formGroupStepTwo: FormGroup;
  formGroupStepThree: FormGroup;

  selectedFirmwareVersion: IManagedObject;
  selectedTenants: ITenant[] = [];
  selectedOperation: IOperation;
  pendingFirmwareStatus: boolean = false;

  operationDetails: FormGroup;

  @ViewChild(OperationSchedulerComponent, { static: false })
  operationScheduler: OperationSchedulerComponent;
  operationDescription: string;
  operationFormName: string;
  operationFormDescription: string;

  constructor(
    private credService: FakeMicroserviceService,
    private provisioning: ProvisioningService,
    private alertService: AlertService,
    private c8yModalService: ModalService
  ) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    if (this.provisionFirmwareObject) {
      this.operationDetails = this.operationScheduler.operationForm;
    }
  }

  /**
   * updateSelected is used to set the selected firmware version for provisioning or de-provisioning
   */
  updateSelectedFirmwareVersion(version: any) {
    this.selectedFirmwareVersion = version;
    this.initScheduleForm();
  }

  /**
   * initScheduleForm is used to set the schedule form details for automatic firmware upgrade scheduling
   */
  initScheduleForm() {
    this.operationDescription = `${this.firmware.name} (version ${this.selectedFirmwareVersion.c8y_Firmware.version})`;
    this.operationFormName = `Update firmware to: ${this.firmware.name} (version: ${this.selectedFirmwareVersion.c8y_Firmware.version})`;
    this.operationFormDescription = `Firmware for hardware revision applied to devices with type ${this.firmware.c8y_Filter?.type}`;
  }

  /**
   * updateSelectedTenants is used to set the selected tenants for provisioning or de-provisioning
   */
  updateSelectedTenants(selectedTenants: any) {
    console.log(selectedTenants);
    this.selectedTenants = selectedTenants;
  }

  /**
   * updateOperationDetails is used to set the schedule form details for automatic firmware upgrade scheduling
   */
  updateOperationDetails(operationDetails: any) {
    this.selectedOperation = operationDetails;
  }

  /**
   * updateStepper is used to update the stepper
   */
  updateStepper($event: { stepper: C8yStepper; step: CdkStep }) {
    $event.step.completed = true;
    $event.stepper.next();
  }

  /**
   * updateFirmware is used to provision or de-provision the firmware to the selected tenants
   */
  updateFirmware() {
    this.provisionFirmwareObject ? this.provisionFirmware() : this.deProvisionFirmware();
  }

  /**
   * provisionFirmware is used to provision the firmware to the selected tenants
   * @param selectedTenants
   */
  async provisionFirmware(): Promise<void> {
    const creds = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const selectedCreds = creds.filter((c) => this.selectedTenants.map((t) => t.id).includes(c.tenant));
    await this.c8yModalService.confirm(
      `Provisioning Firmware`,
      `Are you sure that you want to provision the firmware to all selected ${selectedCreds.length} subtenants? This will create a new Firmware on tenants where it did not exist previously. If the same Firmware was already provisioned previously, it's properties will be overwritten.`,
      'warning'
    );
    this.pendingFirmwareStatus = true;
    const clients = await this.credService.createClients(selectedCreds);
    await this.provisioning
      .provisionLegacyFirmwareToTenants(clients, this.firmware, this.selectedFirmwareVersion, this.selectedOperation)
      .then(() => {
        this.pendingFirmwareStatus = false;
        this.cancel();
        this.alertService.success(`Provisioned Firmware to ${clients.length} subtenants.`);
      })
      .catch((error) => {
        this.pendingFirmwareStatus = false;
        this.cancel();
        this.alertService.danger('Failed to provision Firmware to all selected subtenants.', JSON.stringify(error));
      });
  }

  /**
   * deProvisionFirmware is used to de-provision the firmware to the selected tenants
   * @param selectedTenants
   */
  async deProvisionFirmware(): Promise<void> {
    const creds = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const selectedCreds = creds.filter((c) => this.selectedTenants.map((t) => t.id).includes(c.tenant));
    await this.c8yModalService.confirm(
      `De-Provisioning Firmware`,
      `Are you sure that you want to de-provision the firmware to all selected ${selectedCreds.length} subtenants?`,
      'warning'
    );
    this.pendingFirmwareStatus = true;
    const clients = await this.credService.createClients(selectedCreds);
    await this.provisioning
      .deprovisionLegacyFirmwareFromTenants(clients, this.firmware, this.selectedFirmwareVersion)
      .then(() => {
        this.pendingFirmwareStatus = false;
        this.cancel();
        this.alertService.success(`De-Provisioned Firmware from ${clients.length} subtenants.`);
      })
      .catch((error) => {
        this.pendingFirmwareStatus = false;
        this.cancel();
        this.alertService.danger(
          'Failed to De-provision Firmware from all selected subtenants.',
          JSON.stringify(error)
        );
      });
  }

  cancel() {
    this.onCancel.emit();
    this.resetStepper();
  }

  private resetStepper() {
    this.stepper.reset();
    this.stepper.selectedIndex = 1;
  }
}
