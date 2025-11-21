export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly nickname?: string;
  readonly picture?: string;
  readonly roles: string[];
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly lastLogin?: string;
  readonly blocked?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface UserListResult {
  readonly users: UserProfile[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total?: number;
    readonly hasMore: boolean;
  };
}
