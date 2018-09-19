import {Component, NgZone, OnDestroy} from '@angular/core';
import {IonicPage, NavController, Platform} from 'ionic-angular';
import {IBeacon} from '@ionic-native/ibeacon';
import {HttpClient} from '@angular/common/http';
import {MSAdal} from '@ionic-native/ms-adal';
import {BackgroundMode} from '@ionic-native/background-mode';
import {Diagnostic} from '@ionic-native/diagnostic';
import {LocalNotifications} from '@ionic-native/local-notifications';
import {GeneralProviderService} from '../../providers/general-provider.service';
import {BatteryStatus} from '@ionic-native/battery-status';

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
  delegate: any;
  regions = [];
  beacons: any;
  bgGeo: any;
  counting = 0;
  authContext: any;
  taskRunner: any;
  permissionCheckRunner: any;
  batterySubscription: any;
  beaconArray = [];
  tempBeaconSignalList = [];
  batteryPercentage: any;
  bluetoothWarningMsg = 'Please Enable Bluetooth for the application to work correctly';
  geolocationWarningMsg = 'You must enable "Always" in the Location Services settings';
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
      this.setupPermissionCheckRunner();
      this.registerNetworkCheck();
      this.registerBluetoothCheck();
      this.checkAppStatus();
    });
  }

  setupPermissionCheckRunner() {
    this.permissionCheckRunner = setInterval(() => {
      this.checkAppStatus();
    }, 5000)
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
    this.taskRunner = setInterval(async () => {
      try {
        console.log('Task start');
        await this.bgGeo.start();
        this.status = 'Start';
        await this.startRangingBeaconsInRegion();
        setTimeout(async () => {
          console.log('Task stop');
          this.stopRangingBeaconsInRegion();
          const start = new Date().getTime();
          let currentLocation = await this.bgGeo.getCurrentPosition();
          const end = new Date().getTime();
          const time = (end - start) / 1000.0;
          this.batteryStatus.onChange().subscribe(status => {
            this.batteryPercentage = status.level;
          });
          for (let beacon of this.beaconArray) {
            await this.postCrowdPostion(beacon, currentLocation, time);
          }
          ;
          this.beaconArray = [];
          this.bgGeo.stop();
          this.status = 'Stop';
        }, this.generalProviderService.getSetting('scan_time_in_s') * 1000)
      } catch (e) {
        console.log('Error ranging beacon');
      }
    }, this.generalProviderService.getSetting('scan_period_in_s') * 1000)
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
                    this.selectBeaconStrategy(beacon);
                  });
                });
              },
              error => console.error()
            );
        } catch (e) {
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
      } catch (e) {
        console.log(e);
      }
    });
  }

  async postCrowdPostion(beacon, currentLocation, duration) {
    try {
      let currentBeacon = this.beaconArray.find((i) => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
      const now = new Date();

      // Not update location of Uld that get updated in last 5 mins
      if (!!currentBeacon && currentBeacon.date && ((<any>now - currentBeacon.date) < this.generalProviderService.getSetting('beaconTimeoutAge'))) {
        return;
      }

      if (!currentBeacon) {
        currentBeacon = beacon;
        this.beaconArray.push(beacon);
      }

      let authResponse = await this.authContext.acquireTokenSilentAsync('https://graph.windows.net', this.generalProviderService.getSetting('adalConfig')['clientId'], null);
      this.callCrowdAPI(authResponse.accessToken, beacon, currentLocation['coords'], duration);
    } catch (e) {
      console.log(JSON.stringify(e));
      if (e.code == 'AD_ERROR_SERVER_USER_INPUT_NEEDED') {
        this.generalProviderService.logOut();
        clearInterval(this.taskRunner);
        clearInterval(this.permissionCheckRunner);
        this.generalProviderService.showLogoutNoti()
        this.nav.setRoot('login-page');
      }
      this.generalProviderService.generalErrorHandler();
      console.log(e);
    }
  }

  public isValidBeaconValue(speed, time) {
    const maxDistance = this.generalProviderService.getSetting('distance_move_max_in_m');
    if (maxDistance <= 0) {
      return true;
    } else {
      console.log('Speed ', speed, ' Time ', time);
      return speed * time / 1000 < this.generalProviderService.getSetting('distance_move_max_in_m');
    }
  }

  async callCrowdAPI(accessToken, beacon, coords, duration) {
    if (!this.isValidBeaconValue(coords['speed'], duration)) {
      return;
    }
    let crowdInfo = {
      'latitude': coords['latitude'],
      'longitude': coords['longitude'],
      'speed': coords['speed'],
      'accuracy': coords['accuracy'],
      'heading': coords['heading'],
      'battery': this.batteryPercentage,
      'duration': duration,
      'date': (new Date()).toISOString(),
      'beacon': {
        'proximityUUID': beacon['uuid'],
        'transmission_power': -1,
        'rssi': beacon['rssi'],
        'major': beacon['major'],
        'minor': beacon['minor']
      }
    };
    try {
      console.log(JSON.stringify(crowdInfo));
      await this.generalProviderService.makePost(this.generalProviderService.getSetting('crowdApiUrl'), crowdInfo);
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
        if (state == this.diagnostic.bluetoothState.POWERED_ON) {
          this.bluetoothAvaible = true;
        } else {
          this.bluetoothAvaible = false;
          this.generalProviderService.showBluetoothNoti();
        }
      });
  }

  registerNetworkCheck() {
    window.addEventListener('online', () => this.networkAvaible = true);
    window.addEventListener('offline', () => {
      this.networkAvaible = false;
      this.generalProviderService.showNetworkNoti();
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
    clearInterval(this.permissionCheckRunner);
    setTimeout(() => {
      this.nav.setRoot('login-page');
    }, 100)
  }

  selectBeaconStrategy(beacon) {
    let rssi_selection_mode = this.generalProviderService.getSetting('rssi_selection_mode');
    if (rssi_selection_mode !== 'AVERAGE' && rssi_selection_mode !== 'BEST') {
      rssi_selection_mode = 'BEST';
    }

    switch (rssi_selection_mode) {
      case 'AVERAGE': {
        if (beacon['rssi'] == 0) {
          return;
        }
        const idx = this.beaconArray.findIndex(i => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
        if (idx > -1) {
          this.tempBeaconSignalList[this.beaconArray.length - 1].push(beacon);
          let arr = this.tempBeaconSignalList[idx].map((b) => {
            return b['rssi'];
          });
          const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;
          this.beaconArray[idx]['rssi'] = average;
        } else {
          if (beacon['rssi'] != 0) {
            this.beaconArray.push(beacon);
            this.tempBeaconSignalList[this.beaconArray.length - 1] = [];
            this.tempBeaconSignalList[this.beaconArray.length - 1].push(beacon);
          }
        }
      }
      case 'BEST':
      default: {
        const idx = this.beaconArray.findIndex(i => i.uuid == beacon.uuid && i.major == beacon.major && i.minor == beacon.minor);
        if (idx > -1) {
          this.beaconArray[idx]['rssi'] = beacon['rssi'] == 0 || this.beaconArray[idx]['rssi'] > beacon['rssi'] ?
            this.beaconArray[idx]['rssi'] : beacon['rssi'];
        } else {
          if (beacon['rssi']) {
            this.beaconArray.push(beacon);
          }
        }
        break;
      }
    }
  }

  ngOnDestroy() {
    clearInterval(this.taskRunner);
    clearInterval(this.permissionCheckRunner);
    this.generalProviderService.showSleepNoti();
  }
}
