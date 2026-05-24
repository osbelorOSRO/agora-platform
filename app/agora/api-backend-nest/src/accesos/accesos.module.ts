import { Module, OnModuleInit } from '@nestjs/common';
import { AccessAuthModule } from './access-auth/access-auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { SessionsService } from './sessions/sessions.service';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ServiceTokenModule } from './service-token/service-token.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    AccessAuthModule,
    SessionsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ServiceTokenModule,
    ReportsModule,
  ],
})
export class AccessModule implements OnModuleInit {
  constructor(private readonly sessionsService: SessionsService) {}

  onModuleInit() {
    setInterval(() => this.sessionsService.limpiarSesionesExpiradas(), 60 * 60 * 1000);
  }
}
