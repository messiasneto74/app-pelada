import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMatchDto } from './create-match.dto';
import { CreatePlayerDto } from './create-player.dto';
import { PatchPeladaRulesDto } from './patch-pelada-rules.dto';
import { PatchPlayerDto } from './patch-player.dto';

describe('T5 domain DTOs', () => {
  it('PatchPeladaRulesDto aceita goalkeeperMode válido', async () => {
    const dto = plainToInstance(PatchPeladaRulesDto, {
      playersPerTeam: 6,
      goalkeeperMode: 'ROTATING',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('PatchPeladaRulesDto rejeita playersPerTeam fora do range', async () => {
    const dto = plainToInstance(PatchPeladaRulesDto, { playersPerTeam: 2 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('CreatePlayerDto exige displayName', async () => {
    const dto = plainToInstance(CreatePlayerDto, { displayName: 'João' });
    expect((await validate(dto)).length).toBe(0);

    const bad = plainToInstance(CreatePlayerDto, { displayName: 'J' });
    expect((await validate(bad)).length).toBeGreaterThan(0);
  });

  it('PatchPlayerDto aceita patch parcial', async () => {
    const dto = plainToInstance(PatchPlayerDto, { rating: 9 });
    expect((await validate(dto)).length).toBe(0);
  });

  it('CreateMatchDto converte scheduledAt', async () => {
    const dto = plainToInstance(CreateMatchDto, {
      scheduledAt: '2026-11-01T19:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.scheduledAt).toBeInstanceOf(Date);
  });
});
