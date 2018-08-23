// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  crowdApiUrl: 'https://uld-crowd.sita.siclo-mobile.com/crowd-positions',
  adalConfig: {
    tenant: 'sitaiot.onmicrosoft.com',
    clientId: 'c023c4e4-b84a-4c1a-ace3-d32289f08cff',
    // popUp: true,
    redirectUri: 'http://localhost:4200/login_redirect',
    postLogoutRedirectUri: 'http://localhost:4200',
    endpoints: {
      'https://uld-api.sita.siclo-mobile.com': 'c03ed3b4-5438-4247-b6cd-ef2e20da60fe',
    },
  },
  mapConfig: {
    // please get your own API key here:
    // https://developers.google.com/maps/documentation/javascript/get-api-key?hl=en
    apiKey: 'AIzaSyAvS1cTtst2cOnBHM_xOxMc6brIJB38azw',
  }
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
