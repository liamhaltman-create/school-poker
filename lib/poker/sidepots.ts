export function calculateSidePots(players: any[], potAmount?: number): any[] {
  return [{ amount: potAmount ?? 0, eligiblePlayerIds: players.map((p: any) => p.userId) }]
}
