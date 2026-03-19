import { Component, ChangeDetectionStrategy, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
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
  updatedAt: string;
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
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule, TagModule, TableModule],
  selector: 'app-employee-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="detail-page">
      <div class="page-top">
        <button pButton icon="pi pi-arrow-left" label="Back to Roster" class="p-button-text" (click)="goBack()"></button>
      </div>

      @if (employee()) {
        <div class="page-header">
          <div class="emp-identity">
            <div class="avatar-lg">{{ employee()!.firstName[0] }}{{ employee()!.lastName[0] }}</div>
            <div>
              <h2>{{ employee()!.firstName }} {{ employee()!.lastName }}</h2>
              <span class="subtitle">{{ formatClass(employee()!.role) }} · {{ formatClass(employee()!.employeeClass) }} · {{ employee()!.stateCode }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button pButton [label]="saved() ? 'Saved ✓' : 'Save Changes'" [icon]="saved() ? 'pi pi-check' : 'pi pi-save'" [class.p-button-success]="saved()" (click)="save()" [disabled]="!dirty()"></button>
          </div>
        </div>

        <div class="content-grid">
          <!-- Personal Information -->
          <section class="card">
            <h3>Personal Information</h3>
            <div class="form-grid">
              <div class="field">
                <label>First Name</label>
                <input pInputText [(ngModel)]="form.firstName" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Last Name</label>
                <input pInputText [(ngModel)]="form.lastName" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Email</label>
                <input pInputText [(ngModel)]="form.email" type="email" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Phone</label>
                <input pInputText [(ngModel)]="form.phone" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Date of Birth</label>
                <input pInputText type="date" [(ngModel)]="form.dateOfBirth" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>SSN (Last 4)</label>
                <input pInputText [(ngModel)]="form.ssnLast4" maxlength="4" placeholder="••••" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field full-width">
                <label>Address</label>
                <input pInputText [(ngModel)]="form.address" placeholder="123 Main St, Denver, CO 80202" (ngModelChange)="dirty.set(true)" />
              </div>
            </div>
          </section>

          <!-- Employment Details -->
          <section class="card">
            <h3>Employment Details</h3>
            <div class="form-grid">
              <div class="field">
                <label>Role</label>
                <p-select [options]="roleOptions" [(ngModel)]="form.role" optionLabel="label" optionValue="value" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Employee Class</label>
                <p-select [options]="classOptions" [(ngModel)]="form.employeeClass" optionLabel="label" optionValue="value" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Department</label>
                <p-select [options]="departmentOptions" [(ngModel)]="form.department" optionLabel="label" optionValue="value" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Employment Status</label>
                <p-select [options]="statusOptions" [(ngModel)]="form.employmentStatus" optionLabel="label" optionValue="value" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Hire Date</label>
                <input pInputText type="date" [(ngModel)]="form.hireDate" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>State</label>
                <input pInputText [(ngModel)]="form.stateCode" maxlength="2" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Motor Carrier (DOT)</label>
                <p-select [options]="boolOptions" [(ngModel)]="form.isMotorCarrier" optionLabel="label" optionValue="value" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>CBA Agreement</label>
                <input pInputText [(ngModel)]="form.cbAgreementId" placeholder="e.g. teamsters-local-455" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Manager</label>
                <input pInputText [(ngModel)]="form.managerName" disabled placeholder="Assigned manager" />
              </div>
              <div class="field">
                <label>Work Location</label>
                <input pInputText [(ngModel)]="form.workLocation" (ngModelChange)="dirty.set(true)" placeholder="Denver Central Hub" />
              </div>
            </div>
          </section>

          <!-- Emergency Contact -->
          <section class="card">
            <h3>Emergency Contact</h3>
            <div class="form-grid">
              <div class="field">
                <label>Contact Name</label>
                <input pInputText [(ngModel)]="form.emergencyName" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Relationship</label>
                <input pInputText [(ngModel)]="form.emergencyRelationship" (ngModelChange)="dirty.set(true)" placeholder="Spouse, Parent, etc." />
              </div>
              <div class="field">
                <label>Phone</label>
                <input pInputText [(ngModel)]="form.emergencyPhone" (ngModelChange)="dirty.set(true)" />
              </div>
              <div class="field">
                <label>Email</label>
                <input pInputText [(ngModel)]="form.emergencyEmail" type="email" (ngModelChange)="dirty.set(true)" />
              </div>
            </div>
          </section>

          <!-- Notes -->
          <section class="card">
            <h3>HR Notes</h3>
            <div class="form-grid">
              <div class="field full-width">
                <label>Internal Notes (visible to HR only)</label>
                <textarea pInputText [(ngModel)]="form.hrNotes" rows="3" (ngModelChange)="dirty.set(true)" placeholder="Performance notes, accommodation details, disciplinary history..."></textarea>
              </div>
            </div>
          </section>

          <!-- Pay Rates Section -->
          <section class="card">
            <h3>Pay Rates</h3>
            @if (employee()!.payRates?.length) {
              <p-table [value]="employee()!.payRates!" styleClass="p-datatable-sm" [tableStyle]="{ width: '100%' }">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Job Type</th>
                    <th>Rate</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-rate>
                  <tr>
                    <td>{{ formatClass(rate.jobType) }}</td>
                    <td><strong>{{ rate.ratePerHour | currency:'USD':'symbol':'1.2-2' }}/hr</strong></td>
                    <td>{{ rate.effectiveFrom | date:'mediumDate' }}</td>
                    <td>{{ rate.effectiveTo ? (rate.effectiveTo | date:'mediumDate') : 'Current' }}</td>
                  </tr>
                </ng-template>
              </p-table>
            } @else {
              <p class="no-data">No pay rates configured.</p>
            }
          </section>

          <!-- Certifications Section -->
          <section class="card">
            <h3>Certifications</h3>
            @if (employee()!.certifications?.length) {
              <p-table [value]="employee()!.certifications!" styleClass="p-datatable-sm" [tableStyle]="{ width: '100%' }">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Type</th>
                    <th>Issued</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-cert>
                  <tr>
                    <td>{{ formatClass(cert.type) }}</td>
                    <td>{{ cert.issueDate | date:'mediumDate' }}</td>
                    <td>{{ cert.expiryDate | date:'mediumDate' }}</td>
                    <td>
                      <p-tag
                        [value]="certStatus(cert.expiryDate)"
                        [severity]="certSeverity(cert.expiryDate)"
                      />
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            } @else {
              <p class="no-data">No certifications on file.</p>
            }
          </section>

          <!-- HOS Status (drivers only) -->
          @if (employee()!.isMotorCarrier && hosStatus()) {
            <section class="card">
              <h3>Hours of Service</h3>
              <div class="hos-grid">
                <div class="hos-stat">
                  <span class="hos-val">{{ hosStatus()!.drivingHoursToday | number:'1.1-1' }}h</span>
                  <span class="hos-label">Driving Today</span>
                </div>
                <div class="hos-stat">
                  <span class="hos-val">{{ hosStatus()!.onDutyHoursToday | number:'1.1-1' }}h</span>
                  <span class="hos-label">On Duty Today</span>
                </div>
                <div class="hos-stat highlight">
                  <span class="hos-val">{{ hosStatus()!.hoursAvailableToday | number:'1.1-1' }}h</span>
                  <span class="hos-label">Available Today</span>
                </div>
                <div class="hos-stat">
                  <span class="hos-val">{{ hosStatus()!.weeklyHoursUsed | number:'1.1-1' }}h</span>
                  <span class="hos-label">Weekly Used</span>
                </div>
                <div class="hos-stat highlight">
                  <span class="hos-val">{{ hosStatus()!.weeklyHoursRemaining | number:'1.1-1' }}h</span>
                  <span class="hos-label">Weekly Remaining</span>
                </div>
              </div>
              @if (hosStatus()!.violations?.length) {
                <div class="violations">
                  @for (v of hosStatus()!.violations; track v.message) {
                    <div class="violation"><i class="pi pi-exclamation-triangle"></i> {{ v.message }}</div>
                  }
                </div>
              }
            </section>
          }

          <!-- Meta -->
          <section class="card meta">
            <div class="meta-row"><span>Employee ID</span><code>{{ employee()!.id }}</code></div>
            <div class="meta-row"><span>Created</span><strong>{{ employee()!.createdAt | date:'medium' }}</strong></div>
            <div class="meta-row"><span>Last Updated</span><strong>{{ employee()!.updatedAt | date:'medium' }}</strong></div>
          </section>
        </div>
      } @else {
        <div class="loading">Loading employee...</div>
      }
    </div>
  `,
  styles: [`
    .detail-page { animation: fadeIn 0.25s ease; max-width: 1100px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .page-top { margin-bottom: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
    .emp-identity { display: flex; align-items: center; gap: 16px; }
    .avatar-lg {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--sc-orange); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; font-weight: 700;
    }
    .emp-identity h2 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: var(--sc-text-primary); }
    .subtitle { color: var(--sc-text-secondary); font-size: 0.9rem; }
    .header-actions { display: flex; gap: 8px; }

    .content-grid { display: flex; flex-direction: column; gap: 20px; }
    .card {
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: 12px;
      padding: 20px 24px;
    }
    .card h3 { margin: 0 0 16px; font-size: 1rem; font-weight: 700; color: var(--sc-text-primary); }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full-width { grid-column: 1 / -1; }
    .field label { font-size: 0.82rem; font-weight: 600; color: var(--sc-text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
    .field textarea { width: 100%; resize: vertical; font-family: inherit; font-size: 0.9rem; padding: 10px; border: 1px solid var(--sc-border); border-radius: 6px; }

    .no-data { color: var(--sc-text-secondary); font-size: 0.9rem; margin: 0; }

    .hos-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .hos-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; border-radius: 10px; background: var(--sc-gray-1); }
    .hos-stat.highlight { background: var(--sc-success-1); }
    .hos-val { font-size: 1.3rem; font-weight: 700; color: var(--sc-text-primary); }
    .hos-label { font-size: 0.72rem; color: var(--sc-text-secondary); text-align: center; }

    .violations { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .violation { display: flex; align-items: center; gap: 8px; color: var(--sc-danger-4); font-size: 0.85rem; }

    .meta { display: flex; flex-direction: column; gap: 8px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
    .meta-row span { color: var(--sc-text-secondary); }
    .meta-row code { font-family: var(--sc-font-mono, monospace); font-size: 0.78rem; color: var(--sc-text-secondary); }

    .loading { padding: 60px; text-align: center; color: var(--sc-text-secondary); }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .hos-grid { grid-template-columns: repeat(2, 1fr); }
      .page-header { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class EmployeeDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  readonly employee = signal<Employee | null>(null);
  readonly hosStatus = signal<HOSStatus | null>(null);
  readonly dirty = signal(false);
  readonly isNew = signal(false);

  form: any = {
    firstName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', ssnLast4: '', address: '',
    role: 'DRIVER', employeeClass: 'CDL_A', stateCode: 'CO',
    department: 'OPERATIONS', employmentStatus: 'ACTIVE',
    hireDate: '', isMotorCarrier: true, cbAgreementId: '',
    managerName: '', workLocation: 'Denver Central Hub',
    emergencyName: '', emergencyRelationship: '', emergencyPhone: '', emergencyEmail: '',
    hrNotes: '',
  };

  roleOptions = [
    { label: 'Driver', value: 'DRIVER' },
    { label: 'Dispatcher', value: 'DISPATCHER' },
    { label: 'Route Manager', value: 'ROUTE_MANAGER' },
    { label: 'HR Admin', value: 'HR_ADMIN' },
    { label: 'Payroll Admin', value: 'PAYROLL_ADMIN' },
    { label: 'Executive', value: 'EXECUTIVE' },
    { label: 'System Admin', value: 'SYSTEM_ADMIN' },
  ];

  classOptions = [
    { label: 'CDL A', value: 'CDL_A' },
    { label: 'CDL B', value: 'CDL_B' },
    { label: 'Non-CDL', value: 'NON_CDL' },
    { label: 'Office', value: 'OFFICE' },
    { label: 'Yard', value: 'YARD' },
    { label: 'Temp / Seasonal', value: 'TEMP_SEASONAL' },
  ];

  boolOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  departmentOptions = [
    { label: 'Operations', value: 'OPERATIONS' },
    { label: 'Administration', value: 'ADMINISTRATION' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Safety & Compliance', value: 'SAFETY' },
    { label: 'Management', value: 'MANAGEMENT' },
  ];

  statusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'On Leave', value: 'ON_LEAVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Terminated', value: 'TERMINATED' },
    { label: 'Probationary', value: 'PROBATIONARY' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.isNew.set(true);
      this.dirty.set(true);
      return;
    }

    this.http.get<Employee>(`${this.apiUrl}/api/employees/${id}`).subscribe({
      next: (emp) => {
        this.employee.set(emp);
        this.form = {
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone ?? '',
          dateOfBirth: '',
          ssnLast4: '',
          address: '',
          role: emp.role,
          employeeClass: emp.employeeClass,
          department: ['OFFICE', 'HR_ADMIN', 'PAYROLL_ADMIN', 'EXECUTIVE'].includes(emp.role) ? 'ADMINISTRATION' : 'OPERATIONS',
          employmentStatus: 'ACTIVE',
          hireDate: emp.createdAt ? emp.createdAt.split('T')[0] : '',
          stateCode: emp.stateCode,
          isMotorCarrier: emp.isMotorCarrier,
          cbAgreementId: emp.cbAgreementId ?? '',
          managerName: emp.managerId ? 'Jacob Clark' : 'None',
          workLocation: 'Denver Central Hub',
          emergencyName: '',
          emergencyRelationship: '',
          emergencyPhone: '',
          emergencyEmail: '',
          hrNotes: '',
        };

        // Fetch HOS if motor carrier
        if (emp.isMotorCarrier) {
          this.http.get<HOSStatus>(`${this.apiUrl}/api/employees/${id}/hos`).subscribe({
            next: (hos) => this.hosStatus.set(hos),
          });
        }
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }

  save(): void {
    this.dirty.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }

  readonly saved = signal(false);

  formatClass(cls: string): string {
    return cls.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  certStatus(expiryDate: string): string {
    const diff = new Date(expiryDate).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'EXPIRED';
    if (days < 30) return 'EXPIRING';
    return 'VALID';
  }

  certSeverity(expiryDate: string): 'danger' | 'warn' | 'success' {
    const status = this.certStatus(expiryDate);
    return status === 'EXPIRED' ? 'danger' : status === 'EXPIRING' ? 'warn' : 'success';
  }
}
