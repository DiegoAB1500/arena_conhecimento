const xlsx = require('xlsx');
const path = require('path');

function parseSpecificQuestions(buffer, type) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = type === 'four' ? 'Quatro Alternativas' : 'Duas Alternativas';
  const optionsCount = type === 'four' ? 4 : 2;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada no arquivo.`);
  }

  const data = xlsx.utils.sheet_to_json(sheet);
  if (data.length === 0) {
    throw new Error(`Nenhuma questão encontrada na aba "${sheetName}".`);
  }

  return data.map((row, index) => {
    const options = [];
    for (let i = 1; i <= optionsCount; i++) {
      options.push(row[`Answer ${i}`]);
    }

    return {
      id: `${type}-${index}`,
      question: row['Question'],
      options: options,
      correctIndex: parseInt(row['Correct']) - 1,
      timeLimit: parseInt(row['Time (sec)']) || (type === 'four' ? 180 : 60),
      type: type === 'four' ? 'multiple' : 'boolean'
    };
  });
}

const parseDefaultFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const parseSheet = (sheetName, optionsCount) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const data = xlsx.utils.sheet_to_json(sheet);
    return data.map((row, index) => {
      const options = [];
      for (let i = 1; i <= optionsCount; i++) options.push(row[`Answer ${i}`]);
      return {
        id: `${sheetName}-${index}`,
        question: row['Question'],
        options: options,
        correctIndex: parseInt(row['Correct']) - 1,
        timeLimit: parseInt(row['Time (sec)']) || (optionsCount === 4 ? 180 : 60),
        type: optionsCount === 4 ? 'multiple' : 'boolean'
      };
    });
  };
  return {
    four: parseSheet('Quatro Alternativas', 4),
    two: parseSheet('Duas Alternativas', 2)
  };
};

module.exports = { parseSpecificQuestions, parseDefaultFile };
