import {controller} from "../interfaces";

function authorize() {
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        const controller = target.constructor as unknown as controller;
        const originalMethod = descriptor.value;
        return descriptor;
      };
}

export function Auth() {
    return authorize();
}
