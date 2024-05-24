export function Controller(path: string) {
    return function (constructor: { endpoint?: string }) {
        constructor.endpoint = path;
    };
}
