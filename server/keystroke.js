const TOLERANCE_PER_KEY = 300; // ms
const MAX_DEVIATIONS_ALLOWED = 3;
const THRESHOLD = 500; // distância máxima permitida (ajuste conforme necessário)

function calculateAverageProfile(keystrokeSamples) {
  if (!keystrokeSamples || keystrokeSamples.length === 0) return [];
  const sampleLength = keystrokeSamples[0].length;
  const avgProfile = new Array(sampleLength).fill(0);

  for (const sample of keystrokeSamples) {
    for (let i = 0; i < sampleLength; i++) {
      avgProfile[i] += sample[i];
    }
  }

  for (let i = 0; i < sampleLength; i++) {
    avgProfile[i] /= keystrokeSamples.length;
  }

  return avgProfile;
}

function calculateDistance(currentTimings, avgProfile) {
  if (currentTimings.length !== avgProfile.length) return Infinity;

  let total = 0;
  for (let i = 0; i < currentTimings.length; i++) {
    const diff = currentTimings[i] - avgProfile[i];
    total += diff * diff;
  }

  return Math.sqrt(total);
}

function compareKeystrokeDetailed(currentTimings, keystrokeSamples) {
  if (!keystrokeSamples || keystrokeSamples.length === 0) 
    return { accepted: false, reason: 'Sem amostras salvas.' };

  const sampleLength = keystrokeSamples[0].length;

  if (currentTimings.length !== sampleLength) {
    return { accepted: false, reason: 'Tamanho dos dados diferente do esperado.' };
  }

  const avgProfile = calculateAverageProfile(keystrokeSamples);

  let deviations = 0;
  const differences = [];

  for (let i = 0; i < sampleLength; i++) {
    const diff = Math.abs(currentTimings[i] - avgProfile[i]);
    differences.push(diff);

    if (diff > THRESHOLD) {
      return {
        accepted: false,
        reason: `Desvio no índice ${i} excede limite máximo (${diff.toFixed(2)}ms > ${THRESHOLD}ms).`
      };
    }

    if (diff > TOLERANCE_PER_KEY) {
      deviations++;
    }
  }

  const accepted = deviations <= MAX_DEVIATIONS_ALLOWED;
  const reason = accepted ? 'Comportamento aceito.' : `Número de desvios acima do limite: ${deviations}`;

  return {
    accepted,
    reason,
    avgProfile,
    differences,
    deviations,
    maxAllowedDeviations: MAX_DEVIATIONS_ALLOWED,
    tolerancePerKey: TOLERANCE_PER_KEY,
  };
}

module.exports = {
  compareKeystrokeDetailed,
  calculateAverageProfile,
  calculateDistance,
  THRESHOLD,
};