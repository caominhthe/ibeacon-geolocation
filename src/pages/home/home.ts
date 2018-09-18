import { Component, NgZone, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import { debounceTime } from 'rxjs/operators';
import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MSAdal, AuthenticationContext, AuthenticationResult } from '@ionic-native/ms-adal';
import { BackgroundMode } from '@ionic-native/background-mode';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { GeneralProviderService } from '../../providers/general-provider.service';
import { Observable } from 'rxjs/Observable';
import { BatteryStatus } from '@ionic-native/battery-status';

@IonicPage({
  name: 'home-page'
})

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage implements OnDestroy {

  bluetoothAvaible: boolean;
  networkAvaible = navigator.onLine;
  geolocationAvaible = false;

  platformList: string = '';
  isApp: boolean = true;
  delegate : any;
  regions = [];
  beacons: any;
  bgGeo: any;
  counting = 0;
  authContext: any;
  taskRunner: any;
  batterySubscription: any;
  beaconArray = [];
  bluetoothWarningMsg = 'Please Enable Bluetooth for the application work correctly';
  geolocationWarningMsg = 'You must enable "Always" in the Location Services setting';
  networkWarningMsg = 'Please check your network connection';
  status: string;

  constructor(public nav: NavController,
    public localNotifications: LocalNotifications,
    public platform: Platform,
    public diagnostic: Diagnostic,
    public iBeacon: IBeacon,
    public msAdal: MSAdal,
    private backgroundMode: BackgroundMode,
    public http: HttpClient,
    public generalProviderService: GeneralProviderService,
    public batteryStatus: BatteryStatus,
    public zone: NgZone
  ) {
    let platforms = this.platform.platforms();
    this.backgroundMode.enable();

    this.platformList = platforms.join(', ');

    this.platform.ready().then(async () => {
      await this.generalProviderService.updateNewSettings();
      this.authContext = this.msAdal.createAuthenticationContext(this.generalProviderService.getSetting('adalConfig')['authenticationContext']);
      await this.initialise();
      this.iBeacon.enableBluetooth();
      await this.configureBackgroundGeolocation();
      await this.startRangingBeaconsInRegion();
      await this.bgGeo.start();
      this.status = 'Start';
      this.setupTaskRunner();
      this.registerNetworkCheck();
      this.registerBluetoothCheck();
      this.checkAppStatus();
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
        this.checkAppStatus();
        setTimeout(async () => {
          console.log('Task stop');
          this.stopRangingBeaconsInRegion();
          const start = new Date().getTime();
          let currentLocation = await this.bgGeo.getCurrentPosition();
          const end = new Date().getTime();
          const time = end - start;
          this.batteryStatus.onChange().subscribe(status => {
           console.log(status.level, status.isPlugged);
          });
          for (let beacon of this.beaconArray) {
            await this.postCrowdPostion(beacon, currentLocation, time);
          };
          this.beaconArray = [];
          this.bgGeo.stop();
          this.status = 'Stop';
        }, this.generalProviderService.getSetting('scan_time_in_s')*1000)
      } catch (e) {
        console.log('Error ranging beacon');
      }
    }, this.generalProviderService.getSetting('scan_period_in_s')*1000)
  }

  initialise(): any {
    let promise = new Promise((resolve, reject) => {
      if (this.platform.is('cordova')) {

        this.iBeacon.requestAlwaysAuthorization();

        const regions = this.generalProviderService.getSetting('beacon_proximity_uuids');
        regions.forEach((r) => {
          this.regions.push(this.iBeacon.BeaconRegion('name', r))
        });

        this.delegate = this.iBeacon.Delegate();

        try {
          this.delegate.didRangeBeaconsInRegion()
            .subscribe(
              data => {
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

  async postCrowdPostion(beacon, currentLocation, duration) {
    try {
      let currentBeacon = this.beaconArray.find((i) => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
      const now = new Date();

      // Not update location of Uld that get updated in last 5 mins
      if (!!currentBeacon && currentBeacon.date && ((<any>now - currentBeacon.date) < this.generalProviderService.getSetting('beaconTimeoutAge')) ) {
        return;
      }

      if (!currentBeacon) {
        currentBeacon = beacon;
        this.beaconArray.push(beacon);
      }

      let authResponse = await this.authContext.acquireTokenSilentAsync('https://graph.windows.net', this.generalProviderService.getSetting('adalConfig')['clientId'], null);
      this.callCrowdAPI(authResponse.accessToken, beacon, currentLocation['coords'], duration);
    } catch(e) {
      console.log(JSON.stringify(e));
      if (e.code == 'AD_ERROR_SERVER_USER_INPUT_NEEDED') {
        this.generalProviderService.logOut();
        clearInterval(this.taskRunner);
        this.generalProviderService.showLogoutNoti()
        this.nav.setRoot('login-page');
      }
      this.generalProviderService.generalErrorHandler();
      console.log(e);
    }
  }

  async callCrowdAPI(accessToken, beacon, coords, duration) {
    let crowdInfo = {
      'latitude': coords['latitude'],
      'longitude': coords['longitude'],
      'speed': coords['speed'],
      'accuracy': coords['accuracy'],
      'heading': coords['heading'],
      'duration': duration,
      'date': (new Date()).toISOString(),
      'beacon': {
        'proximityUUID': beacon['uuid'],
        'rssi': beacon['rssi'],
        'major': beacon['major'],
        'minor': beacon['minor']
      }
    }
    try {
      let data = await this.generalProviderService.makePost(this.generalProviderService.getSetting('crowdApiUrl'), crowdInfo);
      console.log('update beacon ', beacon['uuid']);
      this.beaconArray = this.beaconArray.map((i) => {
        if (i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor) {
          let obj = JSON.parse(JSON.stringify(i));
          obj.date = new Date();
          return obj;
        }
        return i;
      });
    } catch (e) {
      this.generalProviderService.showLocationAuthorizationNoti();
    }
  }

  checkBluetoothState() {
    this.diagnostic.getBluetoothState()
      .then((state) => {
        if (state == this.diagnostic.bluetoothState.POWERED_ON){
          this.bluetoothAvaible = true;
        } else {
          this.bluetoothAvaible = false;
          this.generalProviderService.showBluetoothNoti();
        }
      });
  }

  registerNetworkCheck() {
    window.addEventListener('online',  ()=>this.networkAvaible = true);
    window.addEventListener('offline', ()=> {
      this.networkAvaible = false;
    });
  }
  registerBluetoothCheck() {
    this.diagnostic.registerBluetoothStateChangeHandler(() => {
      this.checkBluetoothState();
    });
  }

  checkLocationAuthorization() {
    this.diagnostic.getLocationAuthorizationStatus()
      .then((res: any) => {
        if (res == 'authorized' || (this.platform.is('android') && res == 'GRANTED')) {
          this.geolocationAvaible = true;
        } else {
          this.geolocationAvaible = false;
          this.generalProviderService.showLocationAuthorizationNoti();
        }
      });
  }

  checkAppStatus() {
    this.checkLocationAuthorization();
    this.checkBluetoothState();
  }

  logOut() {
    this.backgroundMode.disable();
    clearInterval(this.taskRunner);
    setTimeout(() => {
      this.nav.setRoot('login-page');
    }, 100)
  }

  ngOnDestroy() {
    clearInterval(this.taskRunner);
  }
}
