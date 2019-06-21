export enum PT_OTA_State {
  not_started = 'ota.pt.state.not-started',
  awaiting_version = 'ota.pt.state.awaiting-version',
  awaiting_ready = 'ota.pt.state.awaiting-ready',
  updating = 'ota.pt.state.updating',
  rebooting = 'ota.pt.state.rebooting',
  verifying_update = 'ota.pt.state.verifying',
  complete = 'ota.pt.state.complete',
  canceling = 'ota.pt.state.canceling',
  canceled = 'ota.pt.state.canceled',
  failed = 'ota.pt.state.failed',
  timeout = 'ota.pt.state.timeout'
}
