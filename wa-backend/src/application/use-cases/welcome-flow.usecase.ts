// src/application/use-cases/welcome-flow.usecase.ts

import { WhatsAppGateway } from '../whatsapp.gateway.js';

export class WelcomeFlowUseCase {
  constructor(private readonly gateway: WhatsAppGateway) {}

  async execute(to: string): Promise<void> {
    const msg1 =
      '¡Hola! 👋 Soy tu Asistente Digital 🤖 Estoy aquí para ayudarte con tu plan.';

    const msg2 =
      'Selecciona una opción para continuar 👇';

    const msg3 = `1️⃣ Ver ofertas
2️⃣ Evaluar RUN
3️⃣ Hablar con un ejecutivo`;

    await this.gateway.sendMessage(to, { text: msg1 });
    await this.gateway.sendMessage(to, { text: msg2 });
    await this.gateway.sendMessage(to, { text: msg3 });
  }
}
