import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  function createContext(): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(value: unknown): CallHandler {
    return {
      handle: jest.fn().mockReturnValue(of(value)),
    };
  }

  it('wraps normal responses in the API envelope', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const interceptor = new TransformInterceptor(reflector);

    const result = await lastValueFrom(
      interceptor.intercept(createContext(), createCallHandler({ ok: true })),
    );

    expect(result).toMatchObject({
      success: true,
      data: { ok: true },
    });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('returns raw responses when transform is skipped', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const interceptor = new TransformInterceptor(reflector);

    const result = await lastValueFrom(
      interceptor.intercept(createContext(), createCallHandler(Buffer.from('xlsx'))),
    );

    expect(result).toEqual(Buffer.from('xlsx'));
  });
});
