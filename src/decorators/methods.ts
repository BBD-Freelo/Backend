import { HttpMethod } from "../enums";
import { controller } from "../interfaces";
import { HttpMethods } from "../types";


function defineEndpoint(route: string, method: HttpMethods) {
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        const controller = target.constructor as unknown as controller;
        controller.endpoints[route] = {
            method,
            handler: descriptor.value
        };
    };
}

export function Get(route: string) {
    return defineEndpoint(route, 'get');
}

export function Post(route: string) {
    return defineEndpoint(route, 'post');
}

export function Delete(route: string) {
    return defineEndpoint(route, 'delete');
}

export function Patch(route: string) {
    return defineEndpoint(route, 'patch');
}

export function Put(route: string) {
    return defineEndpoint(route, 'put');
}
