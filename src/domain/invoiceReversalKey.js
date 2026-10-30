// Chave curta e estável de reversão. O pagamento original é validado
// novamente pelas regras Firestore antes de persistir o evento.
export function reversalOperationId(paymentId) {
  if (!/^evt_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(paymentId || '')) {
    throw new Error('Pagamento histórico: estorno exige revisão.')
  }
  return 'rev_' + paymentId
}
