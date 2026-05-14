export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';
export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'INTERIM' | 'FREELANCE' | 'OTHER';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SUSPENDED' | 'TERMINATED';
export type SalaryCalculationType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';
export type PayrollPeriodStatus = 'OPEN' | 'PROCESSING' | 'CLOSED' | 'LOCKED';
export type PayrollPeriodType = 'MONTHLY' | 'WEEKLY' | 'CUSTOM';
export type PayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PayrollItemType = 'BASE_SALARY' | 'ALLOWANCE' | 'BONUS' | 'OVERTIME' | 'DEDUCTION' | 'ADVANCE' | 'TAX' | 'CNSS' | 'AMO' | 'OTHER';
// Types variable métier (aligné avec Prisma backend)
export type VariableItemType =
  | 'COMMISSION'
  | 'FRAIS'
  | 'AVANCE'
  | 'RETENUE'
  | 'PRIME';

/** Labels français pour l'affichage */
export const VARIABLE_ITEM_TYPE_LABELS: Record<VariableItemType, string> = {
  COMMISSION: 'Commission',
  FRAIS:      'Frais',
  AVANCE:     'Avance',
  RETENUE:    'Retenue',
  PRIME:      'Prime',
};
export type VariableValueType = 'FIXED' | 'PERCENTAGE' | 'HOURS' | 'DAYS';
export type VariableItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED';
// Aligné avec Prisma (backend)
export type RecurringItemType =
  | 'TRANSPORT'
  | 'ANCIENNETE'
  | 'INDEMNITE'
  | 'REPRESENTATION'
  | 'LOGEMENT'
  | 'TELEPHONE'
  | 'PANIER'
  | 'OTHER';
export type RecurringValueType = 'FIXED' | 'PERCENTAGE' | 'SENIORITY_SCALE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK_LEAVE' | 'PAID_LEAVE' | 'UNPAID_LEAVE' | 'HOLIDAY' | 'OTHER';
export type PayslipStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
export type LicensePlanCode = 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'LIFETIME';



// Ajoutez ces types après vos autres interfaces

// ─── PayrollConfig (Configuration de paie) ───────────────────────────────────

export type PayrollRegime = 'MOROCCO_STANDARD' | 'MAROC_TRANSPORT' | 'MOROCCO_OFFSHORE' | 'MOROCCO_AGRICULTURAL';

export interface PayrollConfig {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name' | 'status'>;
  regime: PayrollRegime;
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
  overtimeHoursForRate?: number | null;
  workingDaysPerMonth: number | null;
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  damancomEnabled?: boolean;
  defaultCnssDeclaredDays: number | null;
  payslipTemplate?: string | null;
  notes?: string | null;
  dateEffet: string;
  isActive: boolean;
  version: number;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollConfigPayload {
  companyId: string;
  regime?: PayrollRegime;
  currency?: string;
  weeklyHours?: number;
  monthlyHours?: number;
  overtimeHoursForRate?: number | null;
  workingDaysPerMonth?: number;
  cnssEnabled?: boolean;
  amoEnabled?: boolean;
  irEnabled?: boolean;
  cimrEnabled?: boolean;
  damancomEnabled?: boolean;
  defaultCnssDeclaredDays?: number;
  payslipTemplate?: string;
  notes?: string;
  dateEffet: string;
  isActive?: boolean;
  version?: number;
  createdById?: string;
}

export type UpdatePayrollConfigPayload = Partial<Omit<CreatePayrollConfigPayload, 'companyId'>>;

// Liste des options pour les dropdowns
export const PAYROLL_REGIME_OPTIONS: PayrollRegime[] = ['MOROCCO_STANDARD', 'MAROC_TRANSPORT', 'MOROCCO_OFFSHORE', 'MOROCCO_AGRICULTURAL'];
export const CURRENCY_OPTIONS: string[] = ['MAD', 'EUR', 'USD', 'GBP'];

// ─── Enum lists for dropdowns ─────────────────────────────────────────────────

export const COMPANY_STATUS_OPTIONS: CompanyStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
export const USER_STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
export const EMPLOYEE_STATUS_OPTIONS: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT'];
export const GENDER_OPTIONS: Gender[] = ['MALE', 'FEMALE'];
export const CONTRACT_TYPE_OPTIONS: ContractType[] = ['CDI', 'CDD', 'STAGE', 'INTERIM', 'FREELANCE', 'OTHER'];
export const CONTRACT_STATUS_OPTIONS: ContractStatus[] = ['DRAFT', 'ACTIVE', 'ENDED', 'SUSPENDED', 'TERMINATED'];
export const SALARY_CALCULATION_TYPE_OPTIONS: SalaryCalculationType[] = ['MONTHLY', 'DAILY', 'HOURLY', 'MISSION'];
export const PAYROLL_PERIOD_TYPE_OPTIONS: PayrollPeriodType[] = ['MONTHLY', 'WEEKLY', 'CUSTOM'];
export const PAYROLL_PERIOD_STATUS_OPTIONS: PayrollPeriodStatus[] = ['OPEN', 'PROCESSING', 'CLOSED', 'LOCKED'];
export const PAYROLL_RUN_STATUS_OPTIONS: PayrollRunStatus[] = ['DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
export const PAYROLL_ITEM_TYPE_OPTIONS: PayrollItemType[] = ['BASE_SALARY', 'ALLOWANCE', 'BONUS', 'OVERTIME', 'DEDUCTION', 'ADVANCE', 'TAX', 'CNSS', 'AMO', 'OTHER'];
export const VARIABLE_ITEM_TYPE_OPTIONS: VariableItemType[] = [
  'COMMISSION',
  'FRAIS',
  'AVANCE',
  'RETENUE',
  'PRIME',
];
export const VARIABLE_VALUE_TYPE_OPTIONS: VariableValueType[] = ['FIXED', 'PERCENTAGE', 'HOURS', 'DAYS'];
export const VARIABLE_ITEM_STATUS_OPTIONS: VariableItemStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED'];
export const RECURRING_ITEM_TYPE_OPTIONS: RecurringItemType[] = [
  'TRANSPORT',
  'ANCIENNETE',
  'INDEMNITE',
  'REPRESENTATION',
  'LOGEMENT',
  'TELEPHONE',
  'PANIER',
  'OTHER',
];
export const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'HOLIDAY', 'OTHER'];
export const PAYSLIP_STATUS_OPTIONS: PayslipStatus[] = ['DRAFT', 'GENERATED', 'SENT', 'CANCELLED'];
export const LICENSE_PLAN_OPTIONS: LicensePlanCode[] = ['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];
export const LICENSE_STATUS_OPTIONS: LicenseStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
export const BILLING_CYCLE_OPTIONS: BillingCycle[] = ['MONTHLY', 'YEARLY', 'LIFETIME'];

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  taxIdentifier?: string | null;
  rcNumber?: string | null;
  iceNumber?: string | null;
  cnssNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  currency?: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  legalName?: string;
  taxIdentifier?: string;
  rcNumber?: string;
  iceNumber?: string;
  cnssNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  status?: CompanyStatus;
}
export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

export interface CreateCompanyWithLicenseAndUsersPayload {
  company: CreateCompanyPayload;
  license: Omit<CreateLicensePayload, 'companyId'>;
  users: Array<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    status?: string;
    permissions?: string[];
  }>;
}

export interface User {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  firstName: string;
  lastName: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  status: UserStatus;
  permissions?: string[];
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateUserPayload {
  companyId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  status?: UserStatus;
}
export interface UpdateUserPayload extends Partial<Omit<CreateUserPayload, 'password'>> {
  password?: string;
}

export interface Department {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateDepartmentPayload {
  companyId: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
export type UpdateDepartmentPayload = Partial<Omit<CreateDepartmentPayload, 'companyId'>>;

export interface Position {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  departmentId?: string | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePositionPayload {
  companyId: string;
  name: string;
  departmentId?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
export type UpdatePositionPayload = Partial<Omit<CreatePositionPayload, 'companyId'>>;

export interface Employee {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeCode?: string | null;
  firstName: string;
  lastName: string;
  fullName?: string | null;
  cin?: string | null;
  cnssNumber?: string | null;
  matricule?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  hireDate: string;
  terminationDate?: string | null;
  status: EmployeeStatus;
  departmentId?: string | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  positionId?: string | null;
  position?: Pick<Position, 'id' | 'name'> | null;
  baseSalary?: number | null;
  paymentMode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEmployeePayload {
  companyId: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  employeeCode?: string;
  fullName?: string;
  cin?: string;
  cnssNumber?: string;
  matricule?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  terminationDate?: string;
  status?: EmployeeStatus;
  departmentId?: string;
  positionId?: string;
  baseSalary?: number;
  paymentMode?: string;
  bankName?: string;
  bankAccountNumber?: string;
}
export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'companyId'>>;

export interface EmployeeContract {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  contractType: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string | null;
  baseSalary: number;
  baseRate?: number | null;
  salaryCalculationType?: SalaryCalculationType | null;
  hoursPerMonth?: number | null;
  workingDaysPerMonth?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateContractPayload {
  companyId: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  baseSalary: number;
  baseRate?: number;
  salaryCalculationType?: SalaryCalculationType;
  status?: ContractStatus;
  endDate?: string;
  hoursPerMonth?: number;
  workingDaysPerMonth?: number;
  notes?: string;
}
export type UpdateContractPayload = Partial<Omit<CreateContractPayload, 'companyId' | 'employeeId'>>;

export interface PayrollPeriod {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  type: PayrollPeriodType;
  status: PayrollPeriodStatus;
  isLocked: boolean;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollPeriodPayload {
  companyId: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  type?: PayrollPeriodType;
  status?: PayrollPeriodStatus;
  isLocked?: boolean;
  notes?: string;
  createdById?: string;
}
export type UpdatePayrollPeriodPayload = Partial<Omit<CreatePayrollPeriodPayload, 'companyId'>>;

export interface PayrollRun {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  payrollPeriodId: string;
  payrollPeriod?: Pick<PayrollPeriod, 'id' | 'year' | 'month'>;
  runNumber: number;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  approvedById?: string | null;
  approvedBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  approvedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollRunPayload {
  companyId: string;
  payrollPeriodId: string;
  runNumber?: number;
  status?: PayrollRunStatus;
  notes?: string;
  createdById?: string;
}
export type UpdatePayrollRunPayload = Partial<Omit<CreatePayrollRunPayload, 'companyId' | 'payrollPeriodId'>>;

export interface PayrollItem {
  id: string;
  companyId: string;
  payrollRunId: string;
  payrollRun?: Pick<PayrollRun, 'id' | 'runNumber' | 'status'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  itemType: PayrollItemType;
  code?: string | null;
  label: string;
  quantity?: number | null;
  rate?: number | null;
  amount: number;
  taxable: boolean;
  cnssApplicable: boolean;
  amoApplicable?: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollItemPayload {
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  itemType: PayrollItemType;
  label: string;
  amount: number;
  code?: string;
  quantity?: number;
  rate?: number;
  taxable?: boolean;
  cnssApplicable?: boolean;
  amoApplicable?: boolean;
  sortOrder?: number;
}
export type UpdatePayrollItemPayload = Partial<Omit<CreatePayrollItemPayload, 'companyId' | 'payrollRunId' | 'employeeId'>>;

export interface VariableItem {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  type: VariableItemType;
  valueType: VariableValueType;
  code?: string | null;
  label: string;
  quantity?: number | null;
  unitValue?: number | null;
  percentageValue?: number | null;
  amount: number;
  effectiveDate: string;
  payrollPeriodId?: string | null;
  status: VariableItemStatus;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateVariableItemPayload {
  companyId: string;
  employeeId: string;
  type: VariableItemType;
  label: string;
  amount: number;
  effectiveDate: string;
  valueType?: VariableValueType;
  code?: string;
  quantity?: number;
  unitValue?: number;
  percentageValue?: number;
  payrollPeriodId?: string;
  status?: VariableItemStatus;
  notes?: string;
  createdById?: string;
}
export type UpdateVariableItemPayload = Partial<Omit<CreateVariableItemPayload, 'companyId' | 'employeeId'>>;

export interface EmployeeRecurringItem {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  type: RecurringItemType;
  valueType: RecurringValueType;
  code?: string | null;
  label: string;
  amount?: number | null;
  percentageValue?: number | null;
  seniorityRules?: Record<string, unknown> | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  isCnssApplicable: boolean;
  isTaxable: boolean;
  isAmoApplicable: boolean;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRecurringItemPayload {
  companyId: string;
  employeeId: string;
  type: RecurringItemType;
  label: string;
  valueType?: RecurringValueType;
  amount?: number;
  percentageValue?: number;
  seniorityRules?: Record<string, unknown>;
  isTaxable?: boolean;
  isCnssApplicable?: boolean;
  isAmoApplicable?: boolean;
  isActive?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdById?: string;
}

export type UpdateEmployeeRecurringItemPayload = Partial<Omit<CreateEmployeeRecurringItemPayload, 'companyId' | 'employeeId'>>;

export interface AttendanceRecord {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  date: string;
  status: AttendanceStatus;
  workedHours?: number | null;
  overtimeHours?: number | null;
  lateMinutes?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateAttendancePayload {
  companyId: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  workedHours?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  notes?: string;
}
export type UpdateAttendancePayload = Partial<Omit<CreateAttendancePayload, 'companyId' | 'employeeId' | 'date'>>;

export interface Payslip {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  payrollPeriodId: string;
  payrollPeriod?: Pick<PayrollPeriod, 'id' | 'year' | 'month'>;
  payrollRunId?: string | null;
  payrollRun?: Pick<PayrollRun, 'id' | 'runNumber'> | null;
  status: PayslipStatus;
  grossSalary: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalAdvances: number;
  totalTax: number;
  totalCnss: number;
  netSalary: number;
  currency?: string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
  sentAt?: string | null;
  snapshotData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayslipPayload {
  companyId: string;
  employeeId: string;
  payrollPeriodId: string;
  payrollRunId?: string;
  status?: PayslipStatus;
  grossSalary?: number;
  totalAllowances?: number;
  totalBonuses?: number;
  totalDeductions?: number;
  totalAdvances?: number;
  totalTax?: number;
  totalCnss?: number;
  netSalary?: number;
  currency?: string;
}
export type UpdatePayslipPayload = Partial<Omit<CreatePayslipPayload, 'companyId' | 'employeeId' | 'payrollPeriodId'>>;

export interface License {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  planCode: LicensePlanCode;
  status: LicenseStatus;
  billingCycle: BillingCycle;
  maxUsers?: number | null;
  maxEmployees?: number | null;
  maxStorageMb?: number | null;
  payrollEnabled: boolean;
  rhEnabled: boolean;
  cnssEnabled: boolean;
  taxEnabled: boolean;
  damancomEnabled: boolean;
  cimrEnabled?: boolean;
  availableRegimes?: string[];
  startsAt: string;
  endsAt?: string | null;
  lastRenewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateLicensePayload {
  companyId: string;
  planCode: LicensePlanCode;
  startsAt: string;
  status?: LicenseStatus;
  billingCycle?: BillingCycle;
  maxUsers?: number;
  maxEmployees?: number;
  maxStorageMb?: number;
  payrollEnabled?: boolean;
  rhEnabled?: boolean;
  cnssEnabled?: boolean;
  taxEnabled?: boolean;
  damancomEnabled?: boolean;
  endsAt?: string;
  notes?: string;
}
export type UpdateLicensePayload = Partial<Omit<CreateLicensePayload, 'companyId'>>;

export interface AuditLog {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  userId?: string | null;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Statutory Rates and Tax Brackets (Correction 1 & 2) ─────────────────────

export interface StatutoryRate {
  id: string;
  companyId?: string | null;
  code: string; // e.g., 'CNSS_EMPLOYEE', 'CNSS_EMPLOYER', 'AMO_EMPLOYEE'
  label: string;
  rate: number; // Decimal value (e.g., 0.0525 for 5.25%)
  ceilingAmount?: number | null;
  floorAmount?: number | null;
  effectiveFrom: string; // Date YYYY-MM-DD
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxBracket {
  id: string;
  companyId?: string | null;
  taxCode: string; // e.g., 'IR_SALAIRE'
  annualFrom: number;
  annualTo?: number | null;
  rate: number; // Percentage (e.g., 0.10 for 10%)
  deductionAmount?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Payroll Run Result (Correction 7) ───────────────────────────────────────

export interface PayrollRunEmployeeResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  error?: string;
  grossSalary?: number;
  netSalary?: number;
  // Correction 12 : bases distinctes
  baseSalary?: number;
  cnssGross?: number;
  amoGross?: number;
  taxableGross?: number;
  cnssBase?: number;
  cnssEmpAmount?: number;
  amoEmpAmount?: number;
  cimrEmpAmount?: number;
  totalEmpCharges?: number;
  irAmount?: number;
  totalDeductions?: number;
  totalErCharges?: number;
}

export interface PayrollRunResult {
  runId: string;
  totalEmployees: number;
  processed: number;
  errors: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalErCharges: number;
  results: PayrollRunEmployeeResult[];
}

// ─── Variable Item Gain Mapping (Correction 13) ────────────────────────────

export const VARIABLE_ITEM_IS_GAIN: Record<VariableItemType, boolean> = {
  COMMISSION: true,   // Gains
  FRAIS:      false,  // Expenses/Deductions
  AVANCE:     false,  // Advances (deductions)
  RETENUE:    false,  // Retentions (deductions)
  PRIME:      true,   // Bonuses (gains)
};

export interface ApiError { error: string; }
export type ApiResponse<T> = T | ApiError;
export interface FormErrors { [key: string]: string; }

export function validateRequired(form: Record<string, unknown>, fields: string[]): FormErrors {
  const errors: FormErrors = {};
  for (const field of fields) {
    const val = form[field];
    if (val === null || val === undefined || String(val).trim() === '') {
      errors[field] = 'Ce champ est obligatoire';
    }
  }
  return errors;
}

// Alias for backward compatibility
export type Attendance = AttendanceRecord;