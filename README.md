# Cumulocity Subtenant Management
Tool for managing subtenants from a c8y management or enterprise tenant

## Capabilities of this tool

This tool allows to access subtenants from a Cumulocity enterprise or management tenant.
To do so, it performs priviledge escalation through a dummy microservice, which is created on management/enterprise tenant and subscribed to the desired subtenants.
The microservices credentials are then used to access the subtenants.

The following actions can be performed on the subtenants:
- User
  - creation
  - suspend/reactivation
  - edit
  - delete
  - trigger password reset mail
- Devices
  - list
  - trigger operations (e.g. restart, firmware update or configuration update)
- Device registration requests
  - list
  - cancel/accept
- Firmware update history (see failing/successfull firmware updates)
- Provisioning
  - Alarm mappings
  - Applications
  - Firmware
  - Global roles
  - Retention rules
  - Smart Groups
  - SmartREST templates
  - Tenant options
- Statistics
  - Firmware
  - Inventory
  - Storage
 
These capabilities could be in general extended further. For any requirements raise an issue or contribute by creating a PR.

## Installation

1. Download the [latest release of the Subtenant Management App](https://github.com/SoftwareAG/cumulocity-subtenant-management/releases/latest)
2. Open the Administration app of your enterprise or management tenant
3. Navigate to "Applications" -> "Own applications"
4. Click the "Add application" button in the upper right corner
5. Select "Upload web application" in the dialog and upload the zip file you've downloaded in the first step
6. After a reload of the page, the Subtenant Management App should be available in your app switcher


------------------------------

These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
