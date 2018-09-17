import {Injectable} from '@angular/core';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginPage } from '../pages/login/login';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { BackgroundMode } from '@ionic-native/background-mode';
import { AlertController } from 'ionic-angular/components/alert/alert-controller';
import { environment } from "../enviroments/enviroment";

@Injectable()
export class GeneralProviderService {

  authContext: any;
  settings = null;

  constructor(
    private msAdal: MSAdal,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private backgroundMode: BackgroundMode,
    private localNotifications: LocalNotifications,
  ) {
    this.authContext = this.msAdal.createAuthenticationContext(environment.adalConfig.authenticationContext);
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

  public async makePost(url, data) {
    const httpOptions = await this.prepareHeader();
    const result = await this.http.post(url, data, httpOptions ).toPromise();
    return result;
  }

  public async makeGet(url) {
    const httpOptions = await this.prepareHeader();
    const result = await this.http.get(url, httpOptions).toPromise();
    return result;
  }

  public async prepareHeader(){
    let authResponse = await this.authContext.acquireTokenSilentAsync('https://graph.windows.net', environment.adalConfig.clientId, null);
    return {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + authResponse.accessToken
      })
    };
  }

  public async updateNewSettings() {
    try {
      const settings = await this.makeGet('https://uld-crowd.sita.siclo-mobile.com/settings');
      if (!!settings) {
        this.settings = settings;
      }
    } catch(e) {
      console.log('Error update setting ',JSON.stringify(e));
    }
  }

  public getSetting(key){
    try {
      if (this.settings === null) {
        this.updateNewSettings();
      }
      const setting = !!this.settings[key] ? this.settings[key] : environment[key]
      return setting;
    } catch (e) {
      console.log(e);
    }
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

