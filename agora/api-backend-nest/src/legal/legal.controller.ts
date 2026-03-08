import { Controller, Get, Header } from '@nestjs/common';

@Controller('legal')
export class LegalController {

  @Get('privacy')
  @Header('Content-Type', 'text/html')
  privacy() {
    return `
      <h1>Política de Privacidad</h1>
      <p>Agora responde mensajes iniciados por usuarios mediante Facebook Messenger.</p>
      <p>Los datos se utilizan solo para atención al cliente.</p>
      <p>Contacto: contacto@llevatuplan.cl</p>
    `;
  }

  @Get('terms')
  @Header('Content-Type', 'text/html')
  terms() {
    return `
      <h1>Términos de Servicio</h1>
      <p>Al iniciar conversación mediante Messenger, el usuario acepta respuestas automáticas.</p>
    `;
  }

  @Get('delete-data')
  @Header('Content-Type', 'text/html')
  deleteData() {
    return `
      <h1>Eliminación de Datos</h1>
      <p>Solicitudes: contacto@llevatuplan.cl</p>
    `;
  }
}
