import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { saAuthGuard } from './sa/sa-auth.guard';

export const routes: Routes = [

  // ─── Company Admin ─────────────────────────────────────────────────────────
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      // Knowledge Base (replaces Attractions)
      { path: 'knowledge', loadComponent: () => import('./pages/knowledge/list/knowledge-list.component').then(m => m.KnowledgeListComponent) },
      { path: 'knowledge/new', loadComponent: () => import('./pages/knowledge/form/knowledge-form.component').then(m => m.KnowledgeFormComponent) },
      { path: 'knowledge/import', loadComponent: () => import('./pages/knowledge/import/knowledge-import.component').then(m => m.KnowledgeImportComponent) },
      { path: 'knowledge/:id/edit', loadComponent: () => import('./pages/knowledge/form/knowledge-form.component').then(m => m.KnowledgeFormComponent) },
      // Keep old /attractions redirecting to /knowledge for any bookmarked links
      { path: 'attractions', redirectTo: 'knowledge', pathMatch: 'full' },
      { path: 'conversations', loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent) },
      { path: 'settings/bot', loadComponent: () => import('./pages/settings/bot/bot-settings.component').then(m => m.BotSettingsComponent) },
      { path: 'settings/llm', loadComponent: () => import('./pages/settings/llm/llm-settings.component').then(m => m.LlmSettingsComponent) },
      { path: 'settings/widget', loadComponent: () => import('./pages/settings/widget/widget-settings.component').then(m => m.WidgetSettingsComponent) },
      { path: 'billing', loadComponent: () => import('./pages/billing/billing.component').then(m => m.BillingComponent) },
    ],
  },

  // ─── Super Admin Portal (completely separate — /sa/*) ─────────────────────
  { path: 'sa/login', loadComponent: () => import('./sa/pages/sa-login.component').then(m => m.SaLoginComponent) },
  {
    path: 'sa',
    loadComponent: () => import('./sa/layout/sa-layout.component').then(m => m.SaLayoutComponent),
    canActivate: [saAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./sa/pages/sa-dashboard.component').then(m => m.SaDashboardComponent) },
      { path: 'tenants', loadComponent: () => import('./sa/pages/sa-tenants.component').then(m => m.SaTenantsComponent) },
      { path: 'tenants/new', loadComponent: () => import('./sa/pages/sa-register-tenant.component').then(m => m.SaRegisterTenantComponent) },
      { path: 'analytics', loadComponent: () => import('./sa/pages/sa-dashboard.component').then(m => m.SaDashboardComponent) },
      { path: 'settings', loadComponent: () => import('./sa/pages/sa-settings.component').then(m => m.SaSettingsComponent) },
    ],
  },

  { path: '**', redirectTo: '' },
];
