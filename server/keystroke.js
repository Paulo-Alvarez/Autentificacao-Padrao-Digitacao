function compareKeystroke(currentTimings, keystrokeSamples) {
  if (!keystrokeSamples || keystrokeSamples.length === 0) return false;

  const sampleLength = keystrokeSamples[0].length;
  if (currentTimings.length !== sampleLength) return false;

  // Calcula o perfil médio
  const avgProfile = [];
  for (let i = 0; i < sampleLength; i++) {
    let sum = 0;
    for (let sample of keystrokeSamples) {
      sum += sample[i];
    }
    avgProfile.push(sum / keystrokeSamples.length);
  }

  // Compara a amostra atual com o perfil médio
  let diff = 0;
  for (let i = 0; i < sampleLength; i++) {
    diff += Math.abs(currentTimings[i] - avgProfile[i]);
  }

  const avgDiff = diff / sampleLength;
  return avgDiff < 10000; // tolerância
}

module.exports = { compareKeystroke };