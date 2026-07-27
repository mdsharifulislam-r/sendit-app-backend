export interface ICreateAccount {
  name: string;
  email: string;
  otp: number;
}

export interface IResetPassword {
  email: string;
  otp: number;
}


export interface IChangeEmailAddress {
  name: string;
  email: string;
  otp: number;
}