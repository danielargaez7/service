import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-schedule',
  template: `
    <div class="page-placeholder">
      <h2>Scheduling</h2>
      <p>Manage shifts, assignments, and crew scheduling.</p>
    </div>
  `,
  styles: [`
    .page-placeholder {
      text-align: center;
      padding: 80px 20px;
      color: var(--sc-text-secondary, #64748b);
    }
    h2 { color: var(--sc-text-primary, #1e293b); margin-bottom: 8px; }
  `],
})
export class SchedulePage {}
