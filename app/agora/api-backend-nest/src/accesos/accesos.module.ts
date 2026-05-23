import { Module, OnModuleInit } from '@nestjs/common';
import { AccesosAuthModule } from './accesos-auth/accesos-auth.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { PermisosModule } from './permisos/permisos.module';
import { ServiceTokenModule } from './service-token/service-token.module';
import { ReportesModule } from './reportes/reportes.module';
import { AccesosAuthService } from './accesos-auth/accesos-auth.service';

@Module({
  imports: [
    AccesosAuthModule,
    SesionesModule,
    UsuariosModule,
    RolesModule,
    PermisosModule,
    ServiceTokenModule,
    ReportesModule,
  ],
})
export class AccesosModule implements OnModuleInit {
  constructor(private readonly accesosAuthService: AccesosAuthService) {}

  onModuleInit() {
    // Clean up expired sessions every hour
    setInterval(() => this.accesosAuthService.limpiarSesionesExpiradas(), 60 * 60 * 1000);
  }
}
