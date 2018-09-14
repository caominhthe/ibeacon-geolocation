import {Injectable} from '@angular/core';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import {HttpClient} from '@angular/common/http';
import { LoginPage } from '../pages/login/login';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { BackgroundMode } from '@ionic-native/background-mode';
import { AlertController } from 'ionic-angular/components/alert/alert-controller';

@Injectable()
export class GeneralProviderService {

  constructor(
    private msAdal: MSAdal,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private backgroundMode: BackgroundMode,
    private localNotifications: LocalNotifications,
  ) {
  }

  public logOut() {
    const authContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');
    authContext.tokenCache.clear();
  }


  public showBluetoothNoti() {
    this.localNotifications.schedule({
      id: 1,
      text: 'You need to enable bluetooth',
      led: 'FF0000',
      sound: null
    });
  }

  public showWarning(msg) {
    let alert = this.alertCtrl.create({
      title: 'Warning',
      message: msg,
      buttons: [
        {
          text: 'Ok'
        }],
    });
    alert.present();
  }

  public showLocationAuthorizationNoti() {
    this.localNotifications.schedule({
      id: 2,
      text: '',
      led: 'FF0000',
      sound: null
    });
  }

  public showNetworkNoti() {
    this.localNotifications.schedule({
      id: 3,
      text: 'Please check your network connection',
      led: 'FF0000',
      sound: null
    });
  }

  public showSleepNoti() {
    this.localNotifications.schedule({
      id: 99,
      text: 'Please check your app. It may go to sleep',
      led: 'FF0000',
      sound: null
    });
  }

  public generalErrorHandler() {
    this.localNotifications.schedule({
      id: 4,
      text: 'The app is no longer active. Please re-open it',
      led: 'FF0000',
      sound: null
    });
  }

  public showLogoutNoti() {
    this.localNotifications.schedule({
      id: 5,
      text: 'You have been logged out. Please log in to activate the app',
      led: 'FF0000',
      sound: null
    });
  }


}

