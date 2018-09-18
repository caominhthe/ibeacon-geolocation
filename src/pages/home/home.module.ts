import { HomePage } from "./home";
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import { HeaderComponent } from "../../shared/header.component";
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { GeneralProviderService } from "../../providers/general-provider.service";
import { BatteryStatus } from '@ionic-native/battery-status';

@NgModule({
  declarations: [
    HomePage,
    HeaderComponent
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
  ],
  exports: [
    HomePage
  ],providers: [
    IBeacon,
    Diagnostic,
    LocalNotifications,
    GeneralProviderService,
    BatteryStatus,
    HttpClientModule
  ]
})
export class HomePageModule {}

