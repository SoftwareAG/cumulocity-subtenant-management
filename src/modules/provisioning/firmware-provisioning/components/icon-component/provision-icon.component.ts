import { Component } from "@angular/core";

@Component({
  selector: "provision-icon",
  template: ` <img
    [src]="imageSource"
    alt="Provision Icon"
    style="padding-left: 18px;"
  />`,
})
export class ProvisionIconComponent {
  imageSource = require("/assets/icf_asset-management.svg");
  /**
   * Uncomment this line and comment the above line to use the image from the assets folder in local environment
  imageSource = require("../../../../../assets/icf_asset-management.svg");
  */
  constructor() {}
}
