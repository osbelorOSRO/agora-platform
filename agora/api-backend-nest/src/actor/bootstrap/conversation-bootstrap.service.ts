import { Injectable } from '@nestjs/common';

export type ConversationBootstrapDecision = {
  shouldWelcome: boolean;
  welcomeText: string | null;
  reason: 'meta_first_incoming_delegate' | 'provider_not_enabled';
};

@Injectable()
export class ConversationBootstrapService {
  private static readonly WELCOME_TEXT =
    '¡Hola! 👋 Soy tu Asistente Digital 🤖 Estoy aquí para ayudarte con tu plan.\n' +
    'Selecciona una opción para continuar 👇\n' +
    '1️⃣ Ver ofertas\n' +
    '2️⃣ Evaluar RUN\n' +
    '3️⃣ Hablar con un ejecutivo';

  decideForFirstIncoming(input: {
    provider: string;
    objectType: string;
  }): ConversationBootstrapDecision {
    if (String(input.provider || 'META') !== 'META') {
      return {
        shouldWelcome: false,
        welcomeText: null,
        reason: 'provider_not_enabled',
      };
    }

    return {
      shouldWelcome: true,
      welcomeText: ConversationBootstrapService.WELCOME_TEXT,
      reason: 'meta_first_incoming_delegate',
    };
  }
}
