declare module "smalltalk" {
  export function alert(title: string, message: string, ...options: any[]): Promise<void>;
  export function question(title: string, message: string, ...options: any[]): Promise<void>;
  export function prompt<T>(title: string, message: string, ...options: any[]): Promise<T>;
}
