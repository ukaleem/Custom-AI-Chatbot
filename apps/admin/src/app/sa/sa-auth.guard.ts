import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SaAuthService } from './sa-auth.service';

export const saAuthGuard: CanActivateFn = () => {
  const auth = inject(SaAuthService);
  if (auth.isLoggedIn) return true;
  inject(Router).navigate(['/sa/login']);
  return false;
};
