import { Component, NgZone, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import { debounceTime } from 'rxjs/operators';
import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import { BackgroundMode } from '@ionic-native/background-mode';
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
  regions = [];
  beacons: any;
  bgGeo: any;
  counting = 0;
  authContext: any;
  taskRunner: any;
  beaconArray = [];
  status: string;

  constructor(public nav: NavController,
    public platform: Platform,

    public iBeacon: IBeacon,
    public msAdal: MSAdal,
    private backgroundMode: BackgroundMode,
    public http: HttpClient,
    public zone: NgZone
  ) {
    let platforms = this.platform.platforms();
    this.backgroundMode.enable();

    this.platformList = platforms.join(', ');

    this.platform.ready().then(async () => {
      this.authContext = this.msAdal.createAuthenticationContext(environment.adalConfig.authenticationContext);
      await this.initialise();
      this.iBeacon.enableBluetooth();
      await this.configureBackgroundGeolocation();
      await this.startRangingBeaconsInRegion();
      await this.bgGeo.start();
      this.status = 'Start';
      this.setupTaskRunner();
    });
  }

  async startRangingBeaconsInRegion() {
    for (let i of this.regions)
      await this.iBeacon.startRangingBeaconsInRegion(i);
  }

  async stopRangingBeaconsInRegion() {
    for (let i of this.regions)
      await this.iBeacon.stopRangingBeaconsInRegion(i);
  }

  setupTaskRunner() {
    this.taskRunner = setInterval(async() => {
      try {
        console.log('Task start');
        await this.bgGeo.start();
        this.status = 'Start';
        await this.startRangingBeaconsInRegion();
        setTimeout(async () => {
          console.log('Task stop');
          this.stopRangingBeaconsInRegion();
          for (let beacon of this.beaconArray) {
            let currentLocation = await this.bgGeo.getCurrentPosition();
            await this.postCrowdPostion(beacon, currentLocation);
          };
          this.beaconArray = [];
          this.bgGeo.stop();
          this.status = 'Stop';
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

        const regions = environment.regions;
        regions.forEach((r) => {
          this.regions.push(this.iBeacon.BeaconRegion(r.name, r.uuid))
        });

        this.delegate = this.iBeacon.Delegate();

        try {
          this.delegate.didRangeBeaconsInRegion()
            .subscribe(
              data => {
                this.counting++;
                this.zone.run(() => {
                  let beaconList = data.beacons;
                  beaconList.forEach((beacon) => {
                    const idx = this.beaconArray.findIndex(i => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
                    if (idx > -1 ) {
                      this.beaconArray[idx]['rssi'] = beacon['rssi'] == 0 || this.beaconArray[idx]['rssi'] > beacon['rssi'] ?
                        this.beaconArray[idx]['rssi'] : beacon['rssi'];
                    } else {
                      if (beacon['rssi']) {
                        this.beaconArray.push(beacon);
                      }
                    }
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

  async postCrowdPostion(beacon, currentLocation) {
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

      let authResponse = await this.authContext.acquireTokenSilentAsync('https://graph.windows.net', environment.adalConfig.clientId, null);
      this.callCrowdAPI(authResponse.accessToken, beacon, currentLocation['coords']);
    } catch(e) {
      console.log(e);
    }
  }

  async callCrowdAPI(accessToken, beacon, coords) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + accessToken
      })
    };
    let crowdInfo = {
      'latitude': coords['latitude'],
      'longitude': coords['longitude'],
      'speed': coords['speed'],
      'accuracy': coords['accuracy'],
      'heading': coords['heading'],
      'date': (new Date()).toISOString(),
      'beacon': {
        'proximityUUID': beacon['uuid'],
        'rssi': beacon['rssi'],
        'major': beacon['major'],
        'minor': beacon['minor']
      }
    }
    let data = await this.http.post(environment.crowdApiUrl, crowdInfo, httpOptions ).toPromise();
    console.log('update beacon ', beacon['uuid']);
    this.beaconArray = this.beaconArray.map((i) => {
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
