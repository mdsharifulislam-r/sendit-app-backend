import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { SQS_CONSUMER_KEY } from 'utils/decorators/sqs-consumer';

@Injectable()
export class SqsConsumerRegistry {
    private handlers = new Map<string, Function>();

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly reflector: Reflector,
    ) { }

    scan() {
        this.handlers.clear();
        const components = [
            ...this.discoveryService.getProviders(),
            ...this.discoveryService.getControllers(),
        ];

        for (const wrapper of components) {
            const instance = wrapper.instance;
            if (!instance || typeof instance !== 'object') continue;

            let proto = Object.getPrototypeOf(instance);
            while (proto && proto !== Object.prototype) {
                for (const methodName of Object.getOwnPropertyNames(proto)) {
                    if (methodName === 'constructor') continue;
                    const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
                    if (!descriptor || descriptor.get || descriptor.set) continue;
                    const method = descriptor.value;
                    if (typeof method !== 'function') continue;

                    const eventType =
                        this.reflector.get(SQS_CONSUMER_KEY, method) ||
                        Reflect.getMetadata(SQS_CONSUMER_KEY, method);

                    if (eventType && !this.handlers.has(eventType)) {
                        console.log(
                            `[SqsConsumerRegistry] Registered handler for event "${eventType}" on ${instance.constructor.name}.${methodName}`,
                        );
                        this.handlers.set(eventType, method.bind(instance));
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }
        }

        console.log(
            `[SqsConsumerRegistry] ${this.handlers.size} handler(s): ${[...this.handlers.keys()].join(', ') || '(none)'}`,
        );
    }

    getHandler(eventType: string) {
        return this.handlers.get(eventType);
    }

    hasHandlers(): boolean {
        return this.handlers.size > 0;
    }
}
