import type { ConfigurationOptions } from '@c8y/devkit';
import { author, description, version } from './package.json';
import { gettext } from '@c8y/ngx-components/gettext';

const defaultDescription = gettext(
  'The Administration application enables account administrators to manage their users, roles, tenants, applications and business rules and lets them configure a number of settings for their account.'
);

export default {
  runTime: {
    author,
    description: description || defaultDescription,
    version,
    name: "Subtenant Management",
    contextPath: "sag-pkg-subtenant-management",
    key: "sag-pkg-subtenant-management-application-key",
    globalTitle: 'Cumulocity',
    rightDrawer: true,
    tabsHorizontal: true,
    dynamicOptionsUrl: true,
    contextHelp: true,
    contentSecurityPolicy:
      "base-uri 'none'; default-src 'self' 'unsafe-inline' http: https: ws: wss:; connect-src 'self' http: https: ws: wss:;  script-src 'self' *.bugherd.com *.twitter.com *.twimg.com *.aptrinsic.com  'unsafe-inline' 'unsafe-eval' data:; style-src * 'unsafe-inline' blob:; media-src 'self' blob:; img-src * data: blob:; font-src * data:; frame-src *; worker-src 'self' blob:;",
    upgrade: true,
    icon: {
      class: "c8y-icon-sub-tenants"
    },
    isPackage: true,
    package: 'blueprint'
  },
  buildTime: {
    copy: [
      {
        "from": "README.md",
        "to": "README.md"
      },
      {
        "from": "LICENSE",
        "to": "LICENSE.txt"
      }
    ],
    federation: [
      '@angular/animations',
      '@angular/cdk',
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/router',
      '@angular/upgrade',
      '@c8y/client',
      '@c8y/ngx-components',
      'angular',
      'ngx-bootstrap',
      '@ngx-translate/core',
      '@ngx-formly/core'
    ]
  }
} as const satisfies ConfigurationOptions;
