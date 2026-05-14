import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

type JsonSizeOptions = {
  maxBytes: number;
  maxDepth: number;
};

function depthOf(value: unknown, currentDepth = 0): number {
  if (!value || typeof value !== 'object') return currentDepth;
  if (Array.isArray(value)) {
    return value.reduce(
      (max, item) => Math.max(max, depthOf(item, currentDepth + 1)),
      currentDepth + 1,
    );
  }

  return Object.values(value as Record<string, unknown>).reduce<number>(
    (max, item) => Math.max(max, depthOf(item, currentDepth + 1)),
    currentDepth + 1,
  );
}

export function IsBoundedJson(
  options: JsonSizeOptions,
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isBoundedJson',
      target: target.constructor,
      propertyName,
      constraints: [options],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          const [opts] = args.constraints as [JsonSizeOptions];
          try {
            const serialized = JSON.stringify(value);
            return (
              Buffer.byteLength(serialized, 'utf8') <= opts.maxBytes &&
              depthOf(value) <= opts.maxDepth
            );
          } catch {
            return false;
          }
        },
      },
    });
  };
}
