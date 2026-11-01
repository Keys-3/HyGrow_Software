const { onRequest } = require('firebase-functions/v2/https');
const { createDiseaseHandler } = require('./handler.cjs');
exports.diseaseDetect = onRequest({ timeoutSeconds: 60, memory: '256MiB', concurrency: 8, maxInstances: 5 }, createDiseaseHandler());
