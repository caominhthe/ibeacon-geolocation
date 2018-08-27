import { Component, NgZone, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
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
export class HomePage implements OnDestroy {

  platformList: string = '';
  isApp: boolean = true;
  delegate : any;
  region: any;
  beacons: any;
  bgGeo: any;
  counting = 0;
  authContext: any;
  taskRunner: any;
  beaconArray = [];

  constructor(public nav: NavController,
    public platform: Platform,
    public iBeacon: IBeacon,
    public msAdal: MSAdal,
    public http: HttpClient,
    public zone: NgZone
  ) {
    let platforms = this.platform.platforms();

    this.platformList = platforms.join(', ');

    this.platform.ready().then(async () => {
      this.authContext = this.msAdal.createAuthenticationContext('https://login.microsoftonline.com/sitaiot.onmicrosoft.com');
      await this.initialise();
      if (!(await this.iBeacon.isBluetoothEnabled())) {
        this.iBeacon.enableBluetooth();
      }
      await this.configureBackgroundGeolocation();
      await this.iBeacon.startRangingBeaconsInRegion(this.region);
      await this.bgGeo.start();
      this.setupTaskRunner();
    });
  }

  setupTaskRunner() {
    this.taskRunner = setInterval(async() => {
      try {
        console.log('Task start');
        await this.bgGeo.start();
        await this.iBeacon.startRangingBeaconsInRegion(this.region);
        setTimeout(() => {
          console.log('Task stop');
          this.iBeacon.stopRangingBeaconsInRegion(this.region);
          this.bgGeo.stop();
        }, environment.beaconRangingTime)
      } catch (e) {
        console.log('Error ranging beacon');
      }
    }, environment.beaconRangingInterval)
  }

  initialise(): any {
    let promise = new Promise((resolve, reject) => {
      if (this.platform.is('cordova')) {

        this.iBeacon.requestAlwaysAuthorization();

        this.region = this.iBeacon.BeaconRegion('deskBeacon', 'B9407F30-F5F8-466E-AFF9-25556B57FE6D');
        this.delegate = this.iBeacon.Delegate();

        try {
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
        resolve(true);
      } else {
        console.error('This application needs to be running on a device');
        resolve(false);
      }
    });
    return promise;
  }

  configureBackgroundGeolocation() {
    return new Promise((resolve) => {
      try {
        this.bgGeo = (<any>window).BackgroundGeolocation;

        if (this.bgGeo) {
          this.bgGeo.ready({
            desiredAccuracy: 0,
            distanceFilter: 10,
            stationaryRadius: 25,
            activityRecognitionInterval: 10000,
            stopTimeout: 5,
            debug: false,
            stopOnTerminate: false,
            startOnBoot: true,
          }, () => {
            resolve(true)
          });
        }
      } catch(e) {
        console.log(e);
      }
    });
  }

  postCrowdPostion(beacon) {
    try {
      let currentBeacon = this.beaconArray.find((i) => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
      const now = new Date();

      // Not update location of Uld that get updated in last 5 mins
      if (!!currentBeacon && currentBeacon.date && ((<any>now - currentBeacon.date) < environment.beaconTimeoutAge) ) {
        return;
      }

      if (!currentBeacon) {
        currentBeacon = beacon;
        this.beaconArray.push(beacon);
      }

      this.authContext.acquireTokenSilentAsync('https://graph.windows.net', 'c023c4e4-b84a-4c1a-ace3-d32289f08cff', null)
        .then((authResponse: AuthenticationResult) => {
          this.bgGeo.getCurrentPosition().then((data) => {
            this.callCrowdAPI(authResponse.accessToken, beacon, data['coords']['latitude'], data['coords']['longitude'])
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

  async callCrowdAPI(accessToken, beacon, lat, lon) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + accessToken
      })
    };
    let crowdInfo = {
      'latitude': lat,
      'longitude': lon,
      'date': (new Date()).toISOString(),
      'beacon': {
        'proximityUUID': beacon['uuid'],
        'major': beacon['major'],
        'minor': beacon['minor']
      }
    }
    let data = await this.http.post(environment.crowdApiUrl, crowdInfo, httpOptions ).toPromise();
    console.log('update beacon ', beacon['uuid']);
    this. beaconArray = this.beaconArray.map((i) => {
      if (i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor) {
        let obj = JSON.parse(JSON.stringify(i));
        obj.date = new Date();
        return obj;
      }
      return i;
    });
  }

  ngOnDestroy() {
    clearInterval(this.taskRunner);
  }
}
