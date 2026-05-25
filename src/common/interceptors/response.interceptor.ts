import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        const isObject =
          result !== null && typeof result === 'object';

        const hasDataKey =
          isObject && 'data' in (result as object);

        const message =
          isObject && 'message' in (result as object)
            ? (result as { message?: string }).message ?? 'OK'
            : 'OK';

        const data = hasDataKey
          ? (result as { data: unknown }).data
          : result ?? null;
        return { success: true, message, data };
      }),
    );
  }
}