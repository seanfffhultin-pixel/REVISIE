// Pure generators: the question, answer and working always share the same values.
(function (root) {
  const integer = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const question = (prompt, answer, working) => ({ prompt, answer, working });
  const topics = [
    { id: 'percentages', category: 'Number', name: 'Percentages', generate() {
      const percent = integer(1, 19) * 5, amount = integer(2, 40) * 20;
      return question(`Find ${percent}% of ${amount}.`, percent * amount / 100, `${percent} ÷ 100 × ${amount} = ${percent * amount / 100}.`);
    } },
    { id: 'fractions', category: 'Number', name: 'Fractions of amounts', generate() {
      const denominator = integer(3, 12), numerator = integer(1, denominator - 1), amount = denominator * integer(2, 40);
      return question(`Find ${numerator}/${denominator} of ${amount}.`, amount / denominator * numerator, `${amount} ÷ ${denominator} × ${numerator} = ${amount / denominator * numerator}.`);
    } },
    { id: 'ratio', category: 'Number', name: 'Sharing in a ratio', generate() {
      const a = integer(1, 9), b = integer(1, 9), part = integer(2, 30), total = (a + b) * part;
      return question(`Share £${total} in the ratio ${a}:${b}. How much is the first share, in pounds?`, a * part, `${a} + ${b} = ${a + b} parts. Each part is £${total} ÷ ${a + b} = £${part}. First share: ${a} × £${part} = £${a * part}.`);
    } },
    { id: 'linear', category: 'Algebra', name: 'Linear equations', generate() {
      const a = integer(2, 12), x = integer(-15, 20), b = integer(1, 40), c = a * x + b;
      return question(`Solve ${a}x + ${b} = ${c}. Give x.`, x, `Subtract ${b}: ${a}x = ${c - b}. Divide by ${a}: x = ${x}.`);
    } },
    { id: 'quadratics', category: 'Algebra', name: 'Quadratic equations', generate() {
      const a = integer(1, 15), b = integer(1, 15);
      return question(`Solve x² − ${a + b}x + ${a * b} = 0. Give the smaller root.`, Math.min(a, b), `(x − ${a})(x − ${b}) = 0, so x = ${a} or ${b}. The smaller root is ${Math.min(a, b)}.`);
    } },
    { id: 'sequences', category: 'Algebra', name: 'Arithmetic sequences', generate() {
      const first = integer(-10, 30), difference = integer(2, 12), n = integer(5, 30), answer = first + (n - 1) * difference;
      return question(`A sequence starts ${first}, ${first + difference}, ${first + 2 * difference}, … Find term ${n}.`, answer, `Term n = ${first} + (n − 1) × ${difference}. Term ${n} = ${first} + ${n - 1} × ${difference} = ${answer}.`);
    } },
    { id: 'area', category: 'Geometry and measures', name: 'Area of triangles', generate() {
      const base = integer(2, 40), height = integer(2, 40);
      return question(`A triangle has base ${base} cm and perpendicular height ${height} cm. Find its area in cm².`, base * height / 2, `Area = ½ × base × height = ½ × ${base} × ${height} = ${base * height / 2} cm².`);
    } },
    { id: 'pythagoras', category: 'Geometry and measures', name: 'Pythagoras’ theorem', generate() {
      const [a, b, c] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]][integer(0, 3)], scale = integer(1, 30);
      return question(`A right-angled triangle has perpendicular sides ${a * scale} cm and ${b * scale} cm. Find the hypotenuse in cm.`, c * scale, `c² = ${a * scale}² + ${b * scale}² = ${(c * scale) ** 2}. Take the positive square root: c = ${c * scale} cm.`);
    } },
    { id: 'angles', category: 'Geometry and measures', name: 'Angles in triangles', generate() {
      const a = integer(15, 85), b = integer(15, 85);
      return question(`Two angles in a triangle are ${a}° and ${b}°. Find the third angle in degrees.`, 180 - a - b, `Angles in a triangle sum to 180°. Third angle = 180 − ${a} − ${b} = ${180 - a - b}°.`);
    } },
    { id: 'mean', category: 'Statistics and probability', name: 'Mean', generate() {
      const values = Array.from({ length: 5 }, () => integer(1, 40)), sum = values.reduce((a, b) => a + b, 0);
      return question(`Find the mean of ${values.join(', ')}.`, sum / values.length, `Add the values: ${sum}. Divide by ${values.length}: ${sum} ÷ ${values.length} = ${sum / values.length}.`);
    } },
    { id: 'range', category: 'Statistics and probability', name: 'Range', generate() {
      const values = Array.from({ length: 5 }, () => integer(-20, 60)), min = Math.min(...values), max = Math.max(...values);
      return question(`Find the range of ${values.join(', ')}.`, max - min, `Range = largest − smallest = ${max} − (${min}) = ${max - min}.`);
    } },
    { id: 'probability', category: 'Statistics and probability', name: 'Simple probability', generate() {
      const red = integer(1, 20), blue = integer(1, 20);
      return question(`A bag contains ${red} red and ${blue} blue counters. One counter is chosen at random. What is the probability it is red? Give a fraction or a decimal to 3 decimal places.`, red / (red + blue), `There are ${red + blue} counters. P(red) = ${red}/${red + blue} = ${(red / (red + blue)).toFixed(3)} (3 d.p.).`);
    } },
  ];
  function variantQuestion(id, variant = 0) {
    const topic = topics.find(topic => topic.id === id);
    if (!topic) throw new Error('Unknown maths topic.');
    if (variant === 0) return { ...topic.generate(), skill: id, variant };
    let item;
    if (id === 'percentages') {
      const percent = integer(1, 9) * 10, amount = integer(2, 40) * 20;
      item = variant === 1
        ? question(`A price of £${amount} increases by ${percent}%. Find the new price in pounds.`, amount * (100 + percent) / 100, `Increase = ${amount} × ${percent}/100 = ${amount * percent / 100}. New price = ${amount} + ${amount * percent / 100} = £${amount * (100 + percent) / 100}.`)
        : question(`${percent}% of a number is ${amount * percent / 100}. Find the original number.`, amount, `Divide by ${percent}/100: ${amount * percent / 100} × 100 ÷ ${percent} = ${amount}.`);
    } else if (id === 'fractions') {
      const d = integer(3, 12), n = integer(1, d - 1), total = d * integer(2, 40), part = total / d * n;
      item = variant === 1
        ? question(`A tank holds ${total} litres. ${n}/${d} of the water is used. How many litres remain?`, total - part, `Used = ${total} ÷ ${d} × ${n} = ${part}. Remaining = ${total} − ${part} = ${total - part} litres.`)
        : question(`${n}/${d} of an amount is ${part}. Find the whole amount.`, total, `${part} ÷ ${n} × ${d} = ${total}.`);
    } else if (id === 'ratio') {
      const a = integer(1, 9), b = integer(1, 9), part = integer(2, 30), total = (a + b) * part;
      item = variant === 1
        ? question(`Share £${total} in the ratio ${a}:${b}. Find the second share in pounds.`, b * part, `One part = ${total} ÷ ${a + b} = ${part}. Second share = ${b} × ${part} = £${b * part}.`)
        : question(`Two shares are in the ratio ${a}:${b}. The first share is £${a * part}. Find the total in pounds.`, total, `One part = ${a * part} ÷ ${a} = ${part}. Total = (${a} + ${b}) × ${part} = £${total}.`);
    } else if (id === 'linear') {
      const a = integer(2, 12), b = integer(1, 30), x = integer(-12, 20);
      item = variant === 1
        ? question(`Solve ${a}x − ${b} = ${a * x - b}. Give x.`, x, `Add ${b}: ${a}x = ${a * x}. Divide by ${a}: x = ${x}.`)
        : question(`A number is divided by ${a}, then ${b} is added. The result is ${x + b}. Find the number.`, a * x, `Subtract ${b}: ${x + b} − ${b} = ${x}. Multiply by ${a}: the number is ${a * x}.`);
    } else if (id === 'quadratics') {
      const a = integer(1, 15), b = integer(a + 1, a + 15);
      item = variant === 1
        ? question(`Solve x² − ${a + b}x + ${a * b} = 0. Give the larger root.`, b, `(x − ${a})(x − ${b}) = 0. The roots are ${a} and ${b}, so the larger root is ${b}.`)
        : question(`One root of x² − ${a + b}x + ${a * b} = 0 is ${a}. Find the other root.`, b, `The roots sum to ${a + b}. The other root is ${a + b} − ${a} = ${b}.`);
    } else if (id === 'sequences') {
      const a = integer(-10, 25), d = integer(2, 12), n = integer(5, 25);
      item = variant === 1
        ? question(`An arithmetic sequence begins ${a}, ?, ${a + 2 * d}. Find the missing second term.`, a + d, `The common difference is (${a + 2 * d} − (${a})) ÷ 2 = ${d}. The second term is ${a + d}.`)
        : question(`The nth term is ${d}n + ${a + 10}. Find term ${n}.`, d * n + a + 10, `Substitute n = ${n}: ${d} × ${n} + ${a + 10} = ${d * n + a + 10}.`);
    } else if (id === 'area') {
      const base = integer(2, 40), height = integer(2, 40), area = base * height / 2;
      item = variant === 1
        ? question(`A triangle has area ${area} cm² and base ${base} cm. Find its perpendicular height in cm.`, height, `Height = 2 × area ÷ base = 2 × ${area} ÷ ${base} = ${height} cm.`)
        : question(`A triangle has area ${area} cm² and perpendicular height ${height} cm. Find its base in cm.`, base, `Base = 2 × area ÷ height = 2 × ${area} ÷ ${height} = ${base} cm.`);
    } else if (id === 'pythagoras') {
      const [a, b, c] = [[3, 4, 5], [5, 12, 13], [8, 15, 17]][integer(0, 2)], k = integer(1, 15);
      item = variant === 1
        ? question(`A right-angled triangle has hypotenuse ${c * k} cm and one shorter side ${b * k} cm. Find the other shorter side in cm.`, a * k, `Missing side² = ${c * k}² − ${b * k}² = ${(a * k) ** 2}. Take the positive square root: ${a * k} cm.`)
        : question(`A ladder of length ${c * k} m leans against a vertical wall. Its top is ${b * k} m above level ground. How far is its foot from the wall, in metres?`, a * k, `The wall, ground and ladder form a right-angled triangle. Distance² = ${c * k}² − ${b * k}² = ${(a * k) ** 2}. Distance = ${a * k} m.`);
    } else if (id === 'angles') {
      const a = integer(15, 80), b = integer(15, 80);
      item = variant === 1
        ? question(`An isosceles triangle has two equal angles of ${a}°. Find the third angle in degrees.`, 180 - 2 * a, `Third angle = 180 − 2 × ${a} = ${180 - 2 * a}°.`)
        : question(`The two interior angles opposite an exterior angle of a triangle are ${a}° and ${b}°. Find the exterior angle in degrees.`, a + b, `An exterior angle equals the sum of the two opposite interior angles: ${a} + ${b} = ${a + b}°.`);
    } else if (id === 'mean') {
      const values = Array.from({ length: 5 }, () => integer(1, 30)), total = values.reduce((a, b) => a + b, 0), mean = total / 5;
      item = variant === 1
        ? question(`Five numbers have mean ${mean}. Four of them are ${values.slice(0, 4).join(', ')}. Find the fifth number.`, values[4], `Total = 5 × ${mean} = ${total}. Known total = ${total - values[4]}. Missing number = ${values[4]}.`)
        : question(`The mean of 5 numbers is ${mean}. Find their total.`, total, `Total = mean × number of values = ${mean} × 5 = ${total}.`);
    } else if (id === 'range') {
      const min = integer(-20, 20), range = integer(1, 60), max = min + range;
      item = variant === 1
        ? question(`A data set has minimum ${min} and range ${range}. Find its maximum.`, max, `Maximum = minimum + range = ${min} + ${range} = ${max}.`)
        : question(`A data set has maximum ${max} and range ${range}. Find its minimum.`, min, `Minimum = maximum − range = ${max} − ${range} = ${min}.`);
    } else if (id === 'probability') {
      const red = integer(1, 20), blue = integer(1, 20), total = red + blue, repeats = integer(2, 20);
      item = variant === 1
        ? question(`A bag contains ${red} red and ${blue} blue counters. One is chosen at random. What is the probability it is not red? Give a fraction or a decimal to 3 decimal places.`, blue / total, `Not red means blue. Probability = ${blue}/${total} = ${(blue / total).toFixed(3)} (3 d.p.).`)
        : question(`A bag contains ${red} red and ${blue} blue counters. A counter is chosen and replaced ${total * repeats} times. How many red selections would you expect?`, red * repeats, `Expected frequency = trials × probability = ${total * repeats} × ${red}/${total} = ${red * repeats}.`);
    }
    return { ...item, skill: id, variant };
  }
  const keywords = {
    percentages: /\bpercent(?:age)?s?\b|%/i, fractions: /\bfractions?\b/i, ratio: /\bratios?\b/i,
    linear: /\blinear\b|\bsolv(?:e|ing)\b.*\bequations?\b|\d+x\s*[+−-]/i,
    quadratics: /\bquadratics?\b|x[²2]|\bfactori[sz](?:e|ing|ation)\b/i,
    sequences: /\bsequences?\b|\bnth term\b/i,
    area: /\btriang(?:le|les|ular)\b.*\barea\b|\barea\b.*\btriang/i,
    pythagoras: /\bpythagor/i, angles: /\bangles?\b/i,
    mean: /\bmean\b|\baverage\b/i, range: /\brange\b/i, probability: /\bprobabilit(?:y|ies)\b/i,
  };
  function inferSkills(name, deck = []) {
    const categoryMatches = topics.filter(topic => topic.category.toLowerCase() === name.toLowerCase() || (name === 'Number and algebra' && ['Number', 'Algebra'].includes(topic.category)));
    if (categoryMatches.length) return categoryMatches.map(topic => topic.id);
    const titleMatches = topics.filter(topic => keywords[topic.id].test(name)).map(topic => topic.id);
    if (titleMatches.length) return titleMatches;
    return topics.filter(topic => deck.some(card => keywords[topic.id].test(card[0]))).map(topic => topic.id);
  }
  function numericAnswer(value) {
    const text = String(value).trim().replace(/−/g, '-');
    const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
    if (new RegExp(`^${number}$`).test(text)) return Number(text);
    if (new RegExp(`^${number}\\s*/\\s*${number}$`).test(text)) {
      const [a, b] = text.split('/').map(Number); return b ? a / b : NaN;
    }
    return NaN;
  }
  function isCorrect(value, answer) {
    const parsed = numericAnswer(value);
    return Number.isFinite(parsed) && Math.abs(parsed - answer) <= 0.000501;
  }
  function session(id, count = 10, previous = []) {
    const ids = [...new Set(Array.isArray(id) ? id : [id])];
    if (!ids.length || ids.some(id => !topics.some(topic => topic.id === id))) throw new Error('Choose at least one available maths skill.');
    const questions = [], seen = new Set();
    const recent = new Set(previous), offset = integer(0, 2), skills = [...ids];
    for (let i = skills.length - 1; i > 0; i--) { const j = integer(0, i); [skills[i], skills[j]] = [skills[j], skills[i]]; }
    for (let attempts = 0; questions.length < count && attempts < count * 100; attempts++) {
      const index = questions.length;
      const item = variantQuestion(skills[index % skills.length], (Math.floor(index / skills.length) + offset) % 3);
      if (!seen.has(item.prompt) && (!recent.has(item.prompt) || attempts > count * 50)) { seen.add(item.prompt); questions.push(item); }
    }
    if (questions.length < count) throw new Error('Could not generate enough different questions. Please try again.');
    return questions;
  }
  const api = { topics, numericAnswer, isCorrect, session, inferSkills, variantQuestion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.revisieMaths = api;
})(typeof window !== 'undefined' ? window : globalThis);
