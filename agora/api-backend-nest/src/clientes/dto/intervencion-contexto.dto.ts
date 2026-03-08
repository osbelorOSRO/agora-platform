export class IntervencionContextoDto {
  cliente_id: string;
  solicitado_por_id: number;
  delegado_a_id: number;
  origen: 'bot' | 'panel' | 'n8n';
  motivo: string;
}
