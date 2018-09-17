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
    return await this.http.post(url, data, httpOptions ).toPromise();
  }

  public async makeGet(url) {
    const httpOptions = await this.prepareHeader();
    return await this.http.get(url, httpOptions).toPromise();
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

  public async getNewSettings() {
    try {
      this.makeGet('https://uld-crowd.sita.siclo-mobile.com/settings').then((settings) => {
        console.log(JSON.stringify(settings));
      });
    } catch(e) {
      console.log('Error ',JSON.stringify(e));
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

