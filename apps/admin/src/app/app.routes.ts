import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'attractions', loadComponent: () => import('./pages/attractions/list/attractions-list.component').then(m => m.AttractionsListComponent) },
      { path: 'attractions/new', loadComponent: () => import('./pages/attractions/form/attraction-form.component').then(m => m.AttractionFormComponent) },
      { path: 'attractions/:id/edit', loadComponent: () => import('./pages/attractions/form/attraction-form.component').then(m => m.AttractionFormComponent) },
      { path: 'conversations', loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent) },
      { path: 'settings/bot', loadComponent: () => import('./pages/settings/bot/bot-settings.component').then(m => m.BotSettingsComponent) },
      { path: 'settings/llm', loadComponent: () => import('./pages/settings/llm/llm-settings.component').then(m => m.LlmSettingsComponent) },
      { path: 'settings/widget', loadComponent: () => import('./pages/settings/widget/widget-settings.component').then(m => m.WidgetSettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
