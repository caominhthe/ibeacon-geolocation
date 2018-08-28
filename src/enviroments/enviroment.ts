// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  beaconRangingInterval: 30000, //ms
  beaconRangingTime: 5000, //ms
  beaconTimeoutAge: 0, //ms
  regions: [
    {
      name: 'TestRegion', //required
      uuid: 'B9407F30-F5F8-466E-AFF9-25556B57FE6D' //required
    }],
  crowdApiUrl: 'https://crowd-api.westeurope.cloudapp.azure.com/crowd-positions',
  adalConfig: {
    tenant: 'sitaiot.onmicrosoft.com',
    authenticationContext: 'https://login.microsoftonline.com/sitaiot.onmicrosoft.com',
    clientId: 'c023c4e4-b84a-4c1a-ace3-d32289f08cff',
    endpoints: {
      'https://uld-api.sita.siclo-mobile.com': 'c03ed3b4-5438-4247-b6cd-ef2e20da60fe',
    },
  }
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
