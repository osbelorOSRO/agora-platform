// src/interfaces/http/routes.ts

import { Router } from 'express';
import { authMiddleware } from '../../../infrastructure/http/middleware/auth.middleware.js';
import { MessageController } from '../controllers/message.controller.js';
import { SendMessageUseCase } from '../../../application/use-cases/send-message.usecase.js';
import { SendMediaUseCase } from '../../../application/use-cases/send-media.usecase.js';
import { WhatsAppGateway } from '../../../application/whatsapp.gateway.js';

export function createRoutes(gateway: WhatsAppGateway) {
  const router = Router();

  const sendMessageUseCase = new SendMessageUseCase(gateway);
  const sendMediaUseCase = new SendMediaUseCase(gateway);

  const controller = new MessageController(
    sendMessageUseCase,
    sendMediaUseCase
  );

  router.post(
    '/api/enviar-mensaje',
    authMiddleware,
    controller.enviarMensaje.bind(controller)
  );

  router.post(
    '/api/enviar-desde-n8n',
    controller.enviarDesdeN8n.bind(controller)
  );

  return router;
}
