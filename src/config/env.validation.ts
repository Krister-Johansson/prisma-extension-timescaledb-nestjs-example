import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsUrl, Max, Min, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Strongly-typed view of the environment this app reads.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  // postgres:// connection strings. `require_protocol` forces the scheme to be
  // present (otherwise validator.js accepts bare hosts); `require_tld: false`
  // lets `localhost` pass.
  @IsUrl({
    protocols: ['postgresql', 'postgres'],
    require_protocol: true,
    require_tld: false,
  })
  DATABASE_URL!: string;

  // Shadow DB used by `prisma migrate dev`; lives on the same TimescaleDB server.
  @IsUrl({
    protocols: ['postgresql', 'postgres'],
    require_protocol: true,
    require_tld: false,
  })
  SHADOW_DATABASE_URL!: string;
}

/**
 * `validate` hook for ConfigModule.forRoot. Runs at bootstrap and throws (so the
 * process exits) if the environment is misconfigured.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      'Environment validation failed:\n' +
        errors.map((error) => error.toString()).join('\n'),
    );
  }

  return validated;
}
