type ObjectConstructorWithHasOwn = ObjectConstructor & {
  hasOwn?: (object: unknown, property: PropertyKey) => boolean;
};

const objectConstructor = Object as ObjectConstructorWithHasOwn;

if (typeof objectConstructor.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    configurable: true,
    value: function hasOwn(object: unknown, property: PropertyKey) {
      if (object === null || object === undefined) {
        throw new TypeError("Cannot convert undefined or null to object");
      }

      return Object.prototype.hasOwnProperty.call(Object(object), property);
    },
    writable: true,
  });
}

export {};
