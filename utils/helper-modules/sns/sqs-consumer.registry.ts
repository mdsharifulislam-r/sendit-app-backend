import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { SQS_CONSUMER_KEY } from 'utils/decorators/sqs-consumer';

@Injectable()
export class SqsConsumerRegistry implements OnModuleInit {
    private handlers = new Map<string, Function>();

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly reflector: Reflector,
    ) { }

    onModuleInit() {
        this.scan();
    }

    private scan() {
        const providers = this.discoveryService.getProviders();
        const controllers = this.discoveryService.getControllers();
        const components = [...providers, ...controllers];

        for (const wrapper of components) {
            const instance = wrapper.instance;

            if (!instance) continue;

            const prototype = Object.getPrototypeOf(instance);
            if (!prototype) continue;

            const methodNames = Object.getOwnPropertyNames(prototype)
                .filter((name) => name !== 'constructor');

            for (const methodName of methodNames) {
                const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
                if (!descriptor || descriptor.get || descriptor.set) continue;

                const method = descriptor.value;
                if (typeof method !== 'function') continue;

                const eventType =
                    this.reflector.get(SQS_CONSUMER_KEY, method) ||
                    Reflect.getMetadata(SQS_CONSUMER_KEY, method);

                if (eventType) {
                    console.log(`[SqsConsumerRegistry] Registered handler for event "${eventType}" on ${instance.constructor.name}.${methodName}`);
                    this.handlers.set(
                        eventType,
                        method.bind(instance),
                    );
                }
            }
        }
    }

    getHandler(eventType: string) {
        return this.handlers.get(eventType);
    }

    hasHandlers(): boolean {
        return this.handlers.size > 0;
    }
}