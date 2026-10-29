import { BadRequestException } from '@nestjs/common';
import type { GoalkeeperMode } from '@prisma/client';

type GkExtraFlags = {
  goalkeeperPerTeam?: boolean;
  fixedGoalkeeper?: boolean;
};

export function readGkExtraFlags(extra: unknown): GkExtraFlags {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
    return {};
  }
  const o = extra as Record<string, unknown>;
  return {
    goalkeeperPerTeam: o['goalkeeperPerTeam'] === true,
    fixedGoalkeeper: o['fixedGoalkeeper'] === true,
  };
}

export function assertGoalkeeperExclusive(
  goalkeeperMode: GoalkeeperMode | undefined,
  extra: unknown,
): void {
  const flags = readGkExtraFlags(extra);
  if (flags.goalkeeperPerTeam && flags.fixedGoalkeeper) {
    throw new BadRequestException(
      'Goleiro por time e goleiro fixo no gol não podem ficar ligados ao mesmo tempo.',
    );
  }
  if (
    goalkeeperMode === 'FIXED_PER_TEAM' &&
    flags.fixedGoalkeeper
  ) {
    throw new BadRequestException(
      'goalkeeperMode FIXED_PER_TEAM conflita com fixedGoalkeeper em extra.',
    );
  }
  if (
    goalkeeperMode === 'FIXED_GLOBAL' &&
    flags.goalkeeperPerTeam
  ) {
    throw new BadRequestException(
      'goalkeeperMode FIXED_GLOBAL conflita com goalkeeperPerTeam em extra.',
    );
  }
}

export function mergeExtra(
  current: unknown,
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  if (!patch) {
    return base;
  }
  return { ...base, ...patch };
}
