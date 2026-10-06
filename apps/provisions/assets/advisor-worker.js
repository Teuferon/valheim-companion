// Keep exhaustive combination ranking off the main UI thread.
self.window = self;
importScripts('../data/data.js', '/shared/shopping/core.js', 'planner.js', 'advisor.js');
const items = VPPlanner.definitions(VPR_DATA);
self.onmessage = ({ data: request }) => {
  const combos = VPAdvisor.bestCombos(VPR_DATA.food, request.activity, {
    easy: request.easy, limit: 3, unlockedBiomes: request.unlockedBiomes, items,
  });
  self.postMessage({ version: request.version, combos });
};
