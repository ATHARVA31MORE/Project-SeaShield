export function getBadges(user) {
  const badges = [];

  if (user.totalCheckIns >= 5) badges.push("5 Cleanups");
  if (user.totalWasteCollected >= 50) badges.push("Top Collector");
  if (user.weekendStreak >= 3) badges.push("Weekend Warrior");

  return badges;
}
