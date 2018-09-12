import { HomePage } from "./home";
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import { HeaderComponent } from "../../shared/header.component";
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { GeneralProviderService } from "../../providers/general-provider.service";

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
    HttpClientModule
  ]
})
export class HomePageModule {}

