// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Angular 21 made zoneless the default. The CLI's built-in Karma test entry
// was patched (angular/angular-cli#32049) to re-register zone change detection
// when Zone.js is present, but that fix only touches the *generated* test main
// file — not this custom one. Without it, tests run with zoneless change
// detection (autoDetect=true + OnPush enforcement) while the app itself uses
// zones, producing spurious NG0100 ExpressionChangedAfterItHasBeenChecked
// errors. Provide it here so the test environment matches the app.
@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneChangeDetectionTestModule {}

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, ZoneChangeDetectionTestModule],
  platformBrowserDynamicTesting()
);
