import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { IBeacon } from '@ionic-native/ibeacon';
import { debounceTime } from 'rxjs/operators';
import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import { environment } from '../../enviroments/enviroment';

@IonicPage({
  name: 'home-page'
})

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage implements OnInit {

  platformList: string = '';
  isApp: boolean = true;
  delegate : any;
  region: any;
  beacons: any;
  bgGeo: any;
  counting = 0;
  authContext: any;

  constructor(public nav: NavController,
    public platform: Platform,
    public iBeacon: IBeacon,
    public msAdal: MSAdal,
    public http: HttpClient,
    public zone: NgZone
  ) {
    let platforms = this.platform.platforms();

    this.platformList = platforms.join(', ');

    this.platform.ready().then(() => {
      this.authContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');
      this.initialise();
      this.configureBackgroundGeolocation();
    });
  }

  ngOnInit() {
  }

  initialise(): any {
    let promise = new Promise((resolve, reject) => {
      // we need to be running on a device
      if (this.platform.is('cordova')) {

        // Request permission to use location on iOS
        this.iBeacon.requestAlwaysAuthorization();

        // create a new delegate and register it with the native layer
        this.delegate = this.iBeacon.Delegate();

        try {
          // Subscribe to some of the delegate's event handlers
          this.delegate.didRangeBeaconsInRegion()
            .subscribe(
              data => {
                this.counting++;
                this.zone.run(() => {

                  if (data['beacons']) {
                    this.beacons = [];
                  }

                  let beaconList = data.beacons;
                  beaconList.forEach((beacon) => {
                    this.postCrowdPostion(beacon);
                    this.beacons.push(beacon);
                  });
                });
              },
              error => console.error()
            );
        } catch(e) {
          console.log(e);
        }

        // setup a beacon region – CHANGE THIS TO YOUR OWN UUID
        this.region = this.iBeacon.BeaconRegion('deskBeacon', 'B9407F30-F5F8-466E-AFF9-25556B57FE6D');

        // start ranging
        this.iBeacon.startRangingBeaconsInRegion(this.region)
          .then(
            () => {
              resolve(true);
            },
            error => {
              console.error('Failed to begin monitoring: ', error);
              resolve(false);
            }
          );
      } else {
        console.error('This application needs to be running on a device');
        resolve(false);
      }
    });

    return promise;
  }

  configureBackgroundGeolocation() {
    // 1. Get a reference to the plugin
    console.log('Configuring BackgroundGeolocation');
    try {
      this.bgGeo = (<any>window).BackgroundGeolocation;

      if (this.bgGeo) {
        // 3. Configure it.
        // BackgroundGeoLocation is highly configurable.
        this.bgGeo.ready({
          // Geolocation config
          desiredAccuracy: 0,
          distanceFilter: 10,
          stationaryRadius: 25,
          // Activity Recognition config
          activityRecognitionInterval: 10000,
          stopTimeout: 5,
          // Application config
          debug: false,  // <-- Debug sounds & notifications.
          stopOnTerminate: false,
          startOnBoot: true,
        }, (state) => {
          // This callback is executed when the plugin is ready to use.
          console.log('BackgroundGeolocation is configured and ready to use');

            this.bgGeo.start();
        });
      }
    } catch(e) {
      console.log(e);
    }
  }

  postCrowdPostion(beacon) {
    try {
      this.authContext.acquireTokenSilentAsync('https://graph.windows.net', 'c023c4e4-b84a-4c1a-ace3-d32289f08cff', null)
        .then((authResponse: AuthenticationResult) => {
          this.bgGeo.getCurrentPosition().then((data) => {
            console.log(JSON.stringify(data['coords']));
            const httpOptions = {
              headers: new HttpHeaders({
                'Content-Type':  'application/json',
                'Authorization': 'bearer ' + authResponse.accessToken
              })
            };
            let crowdInfo = {
              'latitude': data['coords']['latitude'],
              'longitude': data['coords']['longitude'],
              'date': (new Date()).toISOString(),
              'beacon': {
                'proximityUUID': beacon['uuid'],
                'major': beacon['major'],
                'minor': beacon['minor']
              }
            }
            // console.log(JSON.stringify(crowdInfo));
            this.http.post(environment.crowdApiUrl, crowdInfo, httpOptions ).toPromise().then((data) => {
              console.log(data)
            }).catch((e) => {
              console.log(JSON.stringify(e));
            });
          });
        })
        .catch((e: any) => {
          console.log('No token found in cache');
          this.nav.push('login-page');
        });
    } catch(e) {
      console.log(e);
    }
  }
}
