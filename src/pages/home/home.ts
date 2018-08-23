import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { IBeacon } from '@ionic-native/ibeacon';
import { debounceTime } from 'rxjs/operators';
import { Events } from 'ionic-angular';
import { HttpClient } from '@angular/common/http';

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


  constructor(public navCtrl: NavController,
    public platform: Platform,
    public iBeacon: IBeacon,
    public zone: NgZone
  ) {
    let platforms = this.platform.platforms();

    this.platformList = platforms.join(', ');

    if (this.platform.is('core') || this.platform.is('mobileweb')) {
      this.isApp = false;
    }
    this.platform.ready().then(() => {
      this.initialise();
      console.log('About to Configuring BackgroundGeolocation');
      this.configureBackgroundGeolocation();
    }
    );
  }

  ngOnInit() {
  }

  ionViewDidLoad() {
    console.debug('ionViewDidLoad HomePage');
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
                console.log('My Beacons ', JSON.stringify(this.beacons));
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
      }, function(state) {
        // This callback is executed when the plugin is ready to use.
        console.log('BackgroundGeolocation is configured and ready to use');
        this.bgGeo.start();
      });
    } catch(e) {
      console.log(e);
    }
  }

  onLocation(location, taskId) {
    console.log('- location: ', location);
  }

  postCrowdPostion(beacon) {
    try {
      if (!!this.bgGeo) {
        this.bgGeo.getCurrentPosition().then((data) => {
          console.log(JSON.stringify(data));
        });
      }
    } catch(e) {

    }
  }
}
