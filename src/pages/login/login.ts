import {Component} from '@angular/core';
import {NavController, AlertController, ToastController, MenuController} from 'ionic-angular';
import {HomePage} from '../home/home';
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
      this.authContext.acquireTokenSilentAsync('https://graph.windows.net', 'c023c4e4-b84a-4c1a-ace3-d32289f08cff', null)
        .then((authResponse: AuthenticationResult) => {
          console.log('Token is' , authResponse.accessToken);
          console.log('Token will expire on', authResponse.expiresOn);
          this.nav.push('home-page');
        })
        .catch((e: any) => {
          console.log('No token found in cache');
        });
    })
  }

  login() {
    const authContext: AuthenticationContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');
    console.log("hello");
    console.log("authContext", authContext);

    authContext.acquireTokenAsync('https://graph.windows.net', 'c023c4e4-b84a-4c1a-ace3-d32289f08cff', 'http://localhost:4200', null, null)
      .then((authResponse: AuthenticationResult) => {
        console.log('Token is' , authResponse.accessToken);
        console.log('UserId is' , authResponse.userInfo.userId);
        console.log('Token will expire on', authResponse.expiresOn);
        this.nav.push('home-page');
      })
      .catch((e: any) => console.log('Authentication failed'));
  }
}
