export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nestjsInternalUrl: process.env.NESTJS_INTERNAL_URL || 'http://api_backend_nest:4001',
  fcaInternalToken: process.env.FCA_INTERNAL_TOKEN || '',
};

if (!env.fcaInternalToken) {
  console.error('[ENV] FCA_INTERNAL_TOKEN no está definido');
  process.exit(1);
}
