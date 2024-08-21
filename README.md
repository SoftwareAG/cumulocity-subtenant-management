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

1. Open the Administration app of your enterprise or management tenant
2. Navigate to "Ecosystem" -> "Extensions"
3. Look for the "Subtenant Management" extension. In case it is not available by default, you can download the [latest release of the Subtenant Management App](https://github.com/SoftwareAG/cumulocity-subtenant-management/releases/latest) and install it into your tenant by clicking "Add extension package"
4. The "Subtenant Management" extension should now be visible within the list. Click on the entry within the list.
5. Now click the "Deploy application" button to install the blueprint as an application into your tenant.
6. Follow the instructions in the dialog.
7. Once your done, the "Subtenant Management" app should be available in your app switcher.


------------------------------

These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
