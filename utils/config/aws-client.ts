import type { AwsCredentialIdentity } from '@aws-sdk/types';

/**
 * AWS SDK client config for ECS (task IAM role) and local dev (.env keys).
 * Do not pass empty credentials — that breaks the default provider chain.
 */
export function awsClientConfig() {
  const region = process.env.AWS_REGION || 'eu-central-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const config: { region: string; credentials?: AwsCredentialIdentity } = {
    region,
  };

  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }

  return config;
}
