import { Injectable } from '@nestjs/common';

export type ConversationBootstrapDecision = {
  shouldWelcome: boolean;
  welcomeText: string | null;
  reason: 'first_incoming_delegate' | 'provider_not_enabled';
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
    const provider = String(input.provider || 'META').toUpperCase();
    const objectType = String(input.objectType || 'PAGE').toUpperCase();
    const enabled =
      provider === 'META' ||
      (provider === 'BAILEYS' && objectType === 'WHATSAPP');

    if (!enabled) {
      return {
        shouldWelcome: false,
        welcomeText: null,
        reason: 'provider_not_enabled',
      };
    }

    return {
      shouldWelcome: true,
      welcomeText: ConversationBootstrapService.WELCOME_TEXT,
      reason: 'first_incoming_delegate',
    };
  }
}
