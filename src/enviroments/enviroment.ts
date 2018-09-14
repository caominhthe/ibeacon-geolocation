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
    },
    {
      name: 'TestRegion 1', //required
      uuid: 'A22D8D96-4D06-D8C7-7AAD-7F4F433F6996' //required
    },
    {
      name: 'TestRegion 2', //required
      uuid: '9B0FB33A-583D-2614-5D19-AC4FB1A3D5FB' //required
    },
    {
      name: 'TestRegion 3', //required
      uuid: '18B77746-0AE4-852D-423A-8805A96CFBAF' //required
    },
  ],
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
