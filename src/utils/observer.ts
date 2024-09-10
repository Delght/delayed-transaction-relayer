import events from 'events'
const eventEmitter = new events.EventEmitter();

class ObserverClass {
  constructor() {}

  on(key: string, func: any) {
    eventEmitter.on(key, func);
  }

  emit(key: string, object: any = {}) {
    eventEmitter.emit(key, object);
  }

  removeListener(key: string, func: any) {
    eventEmitter.removeListener(key, func);
  }
}

const Observer = new ObserverClass();
Object.freeze(Observer);

export default Observer;
