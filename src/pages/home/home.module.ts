import { HomePage } from "./home";
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
  ],
  exports: [
    HomePage
  ],providers: [
    IBeacon,
    HttpClientModule
  ]
})
export class HomePageModule {}

