const { buildCatalogPreview, loadStandardizedCatalog, matchService } = require('./catalogImportService');

function loadServiceCatalog() {
  return buildCatalogPreview(loadStandardizedCatalog());
}

function findCatalogMatch(message) {
  const matched = matchService(message, loadStandardizedCatalog());

  return {
    entry: {
      service: matched.service,
      category: matched.category,
      pic: matched.pic,
      sop: matched.sop,
      sla: matched.sla,
      priority: matched.priority,
      keywords: matched.matchedKeywords,
      priorityRules: matched.priority_rules,
    },
    confidence: matched.confidence,
    matchedOn: matched.matchedKeywords,
  };
}

module.exports = {
  loadServiceCatalog,
  findCatalogMatch,
  matchService,
};
