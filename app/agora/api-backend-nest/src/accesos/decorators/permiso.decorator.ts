import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';
export const RequierePermiso = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
