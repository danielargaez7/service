import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { environment } from '../../../environments/environment';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  employeeClass: string;
  stateCode: string;
  isMotorCarrier: boolean;
  cbAgreementId: string | null;
  managerId: string | null;
  createdAt: string;
  payRates?: PayRate[];
  certifications?: Certification[];
}

interface PayRate {
  id: string;
  jobType: string;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface Certification {
  id: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  documentUrl: string | null;
}

interface HOSStatus {
  employeeId: string;
  drivingHoursToday: number;
  onDutyHoursToday: number;
  hoursAvailableToday: number;
  weeklyHoursUsed: number;
  weeklyHoursRemaining: number;
  violations: Array<{ type: string; message: string; hoursOver: number }>;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
  ],
  selector: 'app-employees',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="employees-page">
      <div class="page-header">
        <div class="header-title">
          <h2>Employee Roster</h2>
          <span class="subtitle">{{ employees().length }} employees across {{ roleBreakdown() }}</span>
        </div>
        <button pButton label="Add Employee" icon="pi pi-plus" class="p-button-primary" (click)="addEmployee()"></button>
      </div>

      <!-- Role Summary -->
      <div class="role-strip">
        <button type="button" class="role-chip" [class.active]="!roleFilter()"
          (click)="roleFilter.set(null)">
          All <span class="role-count">{{ employees().length }}</span>
        </button>
        @for (role of roleCounts(); track role.role) {
          <button type="button" class="role-chip" [class.active]="roleFilter() === role.role"
            (click)="roleFilter.set(roleFilter() === role.role ? null : role.role)">
            {{ formatRole(role.role) }} <span class="role-count">{{ role.count }}</span>
          </button>
        }
      </div>

      <!-- Search -->
      <div class="search-bar">
        <i class="pi pi-search"></i>
        <input pInputText type="text" placeholder="Search by name, email, or ID..."
          [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" />
      </div>

      <!-- Table -->
      <p-table
        [value]="filteredEmployees()"
        [paginator]="true"
        [rows]="20"
        [sortField]="'role'"
        [sortOrder]="1"
        dataKey="id"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{ 'min-width': '70rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="lastName">Name <p-sortIcon field="lastName" /></th>
            <th pSortableColumn="email">Email <p-sortIcon field="email" /></th>
            <th pSortableColumn="role">Role <p-sortIcon field="role" /></th>
            <th pSortableColumn="employeeClass">Class <p-sortIcon field="employeeClass" /></th>
            <th>Phone</th>
            <th pSortableColumn="stateCode">State <p-sortIcon field="stateCode" /></th>
            <th>Motor Carrier</th>
            <th>Union</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-emp>
          <tr class="clickable-row" (click)="viewEmployee(emp)">
            <td>
              <div class="name-cell">
                <div class="avatar">{{ emp.firstName[0] }}{{ emp.lastName[0] }}</div>
                <div>
                  <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
                  <small>{{ emp.id | slice:0:12 }}...</small>
                </div>
              </div>
            </td>
            <td><span class="email-text">{{ emp.email }}</span></td>
            <td><p-tag [value]="formatRole(emp.role)" [severity]="roleSeverity(emp.role)" /></td>
            <td><span class="class-badge">{{ formatClass(emp.employeeClass) }}</span></td>
            <td>{{ emp.phone || '—' }}</td>
            <td>{{ emp.stateCode }}</td>
            <td>
              <span class="bool-dot" [class.yes]="emp.isMotorCarrier" [class.no]="!emp.isMotorCarrier">
                {{ emp.isMotorCarrier ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ emp.cbAgreementId || '—' }}</td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="empty-msg">No employees match your search.</td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Detail Dialog -->
      <p-dialog
        [header]="selectedEmployee()?.firstName + ' ' + selectedEmployee()?.lastName"
        [(visible)]="detailDialogVisible"
        [modal]="true"
        [style]="{ width: '44rem' }"
      >
        @if (selectedEmployee(); as emp) {
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Profile</h4>
              <div class="detail-row"><span>Email</span><strong>{{ emp.email }}</strong></div>
              <div class="detail-row"><span>Phone</span><strong>{{ emp.phone || '—' }}</strong></div>
              <div class="detail-row"><span>Role</span><strong>{{ formatRole(emp.role) }}</strong></div>
              <div class="detail-row"><span>Class</span><strong>{{ formatClass(emp.employeeClass) }}</strong></div>
              <div class="detail-row"><span>State</span><strong>{{ emp.stateCode }}</strong></div>
              <div class="detail-row"><span>Motor Carrier</span><strong>{{ emp.isMotorCarrier ? 'Yes' : 'No' }}</strong></div>
              <div class="detail-row"><span>Union</span><strong>{{ emp.cbAgreementId || 'None' }}</strong></div>
              <div class="detail-row"><span>Hired</span><strong>{{ emp.createdAt | date:'mediumDate' }}</strong></div>
            </div>

            <div class="detail-section">
              <h4>Pay Rates</h4>
              @if (emp.payRates?.length) {
                @for (rate of emp.payRates; track rate.id) {
                  <div class="detail-row">
                    <span>{{ formatClass(rate.jobType) }}</span>
                    <strong>{{ rate.ratePerHour | currency:'USD':'symbol':'1.2-2' }}/hr</strong>
                  </div>
                }
              } @else {
                <p class="no-data">No pay rates configured</p>
              }
            </div>

            <div class="detail-section">
              <h4>Certifications</h4>
              @if (emp.certifications?.length) {
                @for (cert of emp.certifications; track cert.id) {
                  <div class="detail-row">
                    <span>{{ formatClass(cert.type) }}</span>
                    <strong [class.expiring]="isExpiringSoon(cert.expiryDate)">
                      Expires {{ cert.expiryDate | date:'mediumDate' }}
                    </strong>
                  </div>
                }
              } @else {
                <p class="no-data">No certifications on file</p>
              }
            </div>
          </div>
        }
      </p-dialog>

      <!-- HOS Dialog -->
      <p-dialog
        header="Hours of Service Status"
        [(visible)]="hosDialogVisible"
        [modal]="true"
        [style]="{ width: '32rem' }"
      >
        @if (hosStatus()) {
          <div class="hos-detail">
            <div class="hos-row"><span>Driving Today</span><strong>{{ hosStatus()!.drivingHoursToday | number:'1.1-1' }}h</strong></div>
            <div class="hos-row"><span>On Duty Today</span><strong>{{ hosStatus()!.onDutyHoursToday | number:'1.1-1' }}h</strong></div>
            <div class="hos-row highlight"><span>Available Today</span><strong>{{ hosStatus()!.hoursAvailableToday | number:'1.1-1' }}h</strong></div>
            <div class="hos-divider"></div>
            <div class="hos-row"><span>Weekly Hours Used</span><strong>{{ hosStatus()!.weeklyHoursUsed | number:'1.1-1' }}h</strong></div>
            <div class="hos-row highlight"><span>Weekly Remaining</span><strong>{{ hosStatus()!.weeklyHoursRemaining | number:'1.1-1' }}h</strong></div>
            @if (hosStatus()!.violations?.length) {
              <div class="hos-divider"></div>
              <h4 class="violations-title">Violations</h4>
              @for (v of hosStatus()!.violations; track v.message) {
                <div class="violation-row">
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>{{ v.message }}</span>
                </div>
              }
            }
          </div>
        } @else {
          <p>Loading HOS data...</p>
        }
      </p-dialog>
    </div>
  `,
  styles: [`
    .employees-page { animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .page-header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-title h2 { margin: 0 0 4px; font-size: var(--sc-text-2xl); font-weight: 700; color: var(--sc-text-primary); }
    .subtitle { color: var(--sc-text-secondary); font-size: var(--sc-text-sm); }

    .role-strip {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--sc-border);
      background: var(--sc-card-bg);
      color: var(--sc-text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .role-chip:hover { border-color: var(--sc-orange); color: var(--sc-orange); }
    .role-chip.active { background: var(--sc-orange); color: #fff; border-color: var(--sc-orange); }
    .role-count {
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(0,0,0,0.08);
      font-size: 0.72rem;
    }
    .role-chip.active .role-count { background: rgba(255,255,255,0.25); }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      height: 42px;
      border: 1px solid var(--sc-border);
      border-radius: 10px;
      background: var(--sc-card-bg);
      margin-bottom: 16px;
      max-width: 400px;
    }
    .search-bar i { color: var(--sc-text-secondary); }
    .search-bar input { border: none; outline: none; background: transparent; width: 100%; font-size: 0.9rem; color: var(--sc-text-primary); font-family: inherit; }

    .name-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--sc-orange); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
    }
    .name-cell small { display: block; color: var(--sc-text-secondary); font-size: 0.7rem; }
    .email-text { font-size: 0.85rem; color: var(--sc-text-secondary); }

    .class-badge {
      font-size: 0.78rem; font-weight: 600;
      padding: 3px 8px; border-radius: 6px;
      background: var(--sc-gray-1); color: var(--sc-text-primary);
    }

    .bool-dot { font-size: 0.82rem; font-weight: 600; }
    .bool-dot.yes { color: var(--sc-success-4); }
    .bool-dot.no { color: var(--sc-text-secondary); }

    :host ::ng-deep .p-datatable-tbody > tr.clickable-row {
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host ::ng-deep .p-datatable-tbody > tr.clickable-row:hover {
      background: var(--sc-orange-1, #fff7ed) !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    :host ::ng-deep .p-datatable-tbody > tr.clickable-row:active {
      transform: translateY(0);
      box-shadow: none;
    }

    .action-buttons { display: flex; gap: 4px; opacity: 0.4; transition: opacity 0.15s ease; }
    :host ::ng-deep .p-datatable-tbody > tr:hover .action-buttons { opacity: 1; }

    .empty-msg { text-align: center; padding: 40px; color: var(--sc-text-secondary); }

    /* Detail Dialog */
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .detail-section { display: flex; flex-direction: column; gap: 8px; }
    .detail-section:last-child { grid-column: 1 / -1; }
    .detail-section h4 { margin: 0 0 4px; font-size: 0.9rem; font-weight: 700; color: var(--sc-text-primary); }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--sc-border); font-size: 0.85rem; }
    .detail-row span { color: var(--sc-text-secondary); }
    .detail-row strong { color: var(--sc-text-primary); }
    .detail-row strong.expiring { color: var(--sc-danger-4); }
    .no-data { color: var(--sc-text-secondary); font-size: 0.85rem; margin: 0; }

    /* HOS Dialog */
    .hos-detail { display: flex; flex-direction: column; gap: 10px; }
    .hos-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem; }
    .hos-row span { color: var(--sc-text-secondary); }
    .hos-row strong { color: var(--sc-text-primary); font-size: 1.1rem; }
    .hos-row.highlight { background: var(--sc-gray-1); padding: 8px 12px; border-radius: 8px; }
    .hos-divider { height: 1px; background: var(--sc-border); margin: 4px 0; }
    .violations-title { margin: 0; font-size: 0.9rem; color: var(--sc-danger-4); }
    .violation-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--sc-danger-4); }

    @media (max-width: 640px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class EmployeesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  readonly employees = signal<Employee[]>([]);
  readonly searchTerm = signal('');
  readonly roleFilter = signal<string | null>(null);
  readonly selectedEmployee = signal<Employee | null>(null);
  readonly hosStatus = signal<HOSStatus | null>(null);
  detailDialogVisible = false;
  hosDialogVisible = false;

  readonly roleCounts = computed(() => {
    const map = new Map<string, number>();
    for (const emp of this.employees()) {
      map.set(emp.role, (map.get(emp.role) ?? 0) + 1);
    }
    return [...map.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);
  });

  readonly roleBreakdown = computed(() =>
    this.roleCounts().map((r) => `${r.count} ${this.formatRole(r.role).toLowerCase()}s`).join(', ')
  );

  readonly filteredEmployees = computed(() => {
    let result = this.employees();
    const search = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    if (role) result = result.filter((e) => e.role === role);
    if (search) {
      result = result.filter((e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search) ||
        e.email.toLowerCase().includes(search) ||
        e.id.toLowerCase().includes(search)
      );
    }
    return result;
  });

  ngOnInit(): void {
    this.http.get<{ data: Employee[] }>(`${this.apiUrl}/api/employees`).subscribe({
      next: (res) => this.employees.set(res.data),
    });
  }

  viewEmployee(emp: Employee): void {
    this.router.navigate(['/employees', emp.id]);
  }

  addEmployee(): void {
    this.router.navigate(['/employees', 'new']);
  }

  viewHOS(emp: Employee): void {
    this.hosStatus.set(null);
    this.hosDialogVisible = true;
    this.http.get<HOSStatus>(`${this.apiUrl}/api/employees/${emp.id}/hos`).subscribe({
      next: (hos) => this.hosStatus.set(hos),
    });
  }

  formatRole(role: string): string {
    const map: Record<string, string> = {
      DRIVER: 'Driver',
      DISPATCHER: 'Dispatcher',
      ROUTE_MANAGER: 'Manager',
      HR_ADMIN: 'HR Admin',
      PAYROLL_ADMIN: 'Payroll',
      EXECUTIVE: 'Executive',
      SYSTEM_ADMIN: 'Sys Admin',
    };
    return map[role] ?? role;
  }

  formatClass(cls: string): string {
    return cls.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  roleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (role) {
      case 'DRIVER': return 'info';
      case 'ROUTE_MANAGER': return 'warn';
      case 'HR_ADMIN': return 'danger';
      case 'PAYROLL_ADMIN': return 'success';
      default: return 'secondary';
    }
  }

  isExpiringSoon(expiryDate: string): boolean {
    const diff = new Date(expiryDate).getTime() - Date.now();
    return diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
  }
}
