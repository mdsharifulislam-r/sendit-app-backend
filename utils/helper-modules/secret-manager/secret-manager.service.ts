import { Injectable } from '@nestjs/common';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';
  
@Injectable()
export class SecretManagerService {
    private readonly secretsManagerClient: SecretsManagerClient;

    constructor(private readonly configService: ConfigService) {
        this.secretsManagerClient = new SecretsManagerClient({
            region: this.configService.get('AWS_REGION'),
        });
    }

    async loadSecretInEnvironmentVariables() {
        const command = new GetSecretValueCommand({
            SecretId: this.configService.get('AWS_SECRET_NAME'),
        });
        const response = await this.secretsManagerClient.send(command);
        const secret = response.SecretString ?? '';
        console.log('secret', secret);
        const secretObject = JSON.parse(secret);
        console.log('secretObject', secretObject);
        Object.entries(secretObject).forEach(([key, value]) => {
            process.env[key] = value as string ?? '';
            console.log('key', key, 'value', value);
        });
    }
}
