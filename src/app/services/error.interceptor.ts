import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = this.getErrorMessage(error);
        console.error(`[HTTP Error] ${req.method} ${req.url}: ${message}`);
        return throwError(() => error);
      })
    );
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network error — unable to reach the server';
    }
    if (error.status === 404) {
      return 'Resource not found';
    }
    if (error.status >= 500) {
      return `Server error (${error.status})`;
    }
    return `HTTP ${error.status}: ${error.statusText}`;
  }
}
