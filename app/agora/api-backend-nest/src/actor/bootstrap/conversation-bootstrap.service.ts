import { Injectable } from '@nestjs/common';

export type ConversationBootstrapDecision = {
  shouldWelcome: boolean;
  welcomeText: string | null;
  reason: 'first_incoming_delegate' | 'provider_not_enabled';
};

@Injectable()
export class ConversationBootstrapService {
  private static readonly WELCOME_TEXT =
    '¡Hola! 👋 Gracias por escribirnos.\n' +
    'Soy tu ejecutivo de ventas Movistar Chile y voy a ayudarte a encontrar el plan perfecto para ti 📱\n' +
    '¿Por dónde quieres empezar?\n' +
    '1️⃣ Ver ofertas disponibles\n' +
    '2️⃣ Revisar mi RUN\n' +
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
