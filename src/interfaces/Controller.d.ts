import { EndpointDefenition } from "./EndpointDefention";

export interface controller {
    endpoint: string;
    endpoints: { [key: string]: EndpointDefenition };
}