// Loan Domain Model
export interface Loan {
  readonly id: string;
  readonly deviceId: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly from: Date;
  readonly till: Date;
  readonly status:
    | 'Requested'
    | 'Approved'
    | 'Rejected'
    | 'Cancelled'
    | 'Collected'
    | 'Returned'
    | 'Overdue';
}
