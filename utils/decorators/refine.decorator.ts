import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

type RefineCallback<T = any> = (
  value: any,
  dto: T,
  args: ValidationArguments,
) => boolean;

interface RefineOptions extends ValidationOptions {
  validator: RefineCallback;
}

export function Refine(options: RefineOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'refine',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return options.validator(
            value,
            args.object,
            args,
          );
        },

        defaultMessage(args: ValidationArguments): string {
          if (typeof options.message === 'function') {
            return options.message(args);
          }

          return (
            options.message ||
            `${args.property} validation failed`
          );
        },
      },
    });
  };
}