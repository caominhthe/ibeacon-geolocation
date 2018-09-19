import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import { environment } from '../../enviroments/enviroment';
import { IonicPage, Platform } from "ionic-angular";

@IonicPage({
  name: 'login-page'
})

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  authContext: any;

  constructor(public nav: NavController,
    private platform: Platform,
    private msAdal: MSAdal) {
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.authContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');
      this.authContext.acquireTokenSilentAsync('https://graph.windows.net', environment.adalConfig.clientId, null)
        .then((authResponse: AuthenticationResult) => {
          this.nav.push('home-page');
        })
        .catch((e: any) => {
          console.log('No token found in cache');
        });
    })
  }

  login() {
    const authContext: AuthenticationContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');

    authContext.acquireTokenAsync('https://graph.windows.net', environment.adalConfig.clientId, 'http://localhost:4200', null, null)
      .then((authResponse: AuthenticationResult) => {
        this.nav.push('home-page');
      })
      .catch((e: any) => console.log(JSON.stringify(e)));
  }
}
