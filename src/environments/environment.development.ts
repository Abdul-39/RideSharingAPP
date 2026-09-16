/**
 * Copy/rename usage when testing on device/emulator.
 * Emulator loopback to host machine: 10.0.2.2
 * Physical device: replace with your PC IPv4 from `ipconfig`.
 */
export const environment = {
  production: false,
  apiUrl: 'http://10.0.2.2:7038/api/v1',
  signalRUrl: 'http://10.0.2.2:7038/hubs',
  googleMapsApiKey: '',
  isMobileShell: true
};
