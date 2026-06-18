/**
 * Validate contractor induction question answers against configured correct answers.
 */

const getQuestionField = (induction, questionNumber, field) =>
  induction[`question_${questionNumber}_${field}`];

const hasQuestionText = (induction, questionNumber) =>
  Boolean(getQuestionField(induction, questionNumber, 'text')?.trim());

const normalizeSingleSelectAnswer = (answer) => {
  if (answer === null || answer === undefined || answer === '') {
    return null;
  }
  if (typeof answer === 'number') {
    return answer;
  }
  const parsed = Number(answer);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeMultiSelectAnswer = (answer) => {
  if (answer === null || answer === undefined) {
    return [];
  }
  const values = Array.isArray(answer) ? answer : [answer];
  return [...new Set(values.map((value) => Number(value)).filter((value) => !Number.isNaN(value)))]
    .sort((a, b) => a - b);
};

const normalizeCorrectAnswer = (correctAnswer, questionType) => {
  if (questionType === 'multi-select') {
    if (Array.isArray(correctAnswer)) {
      return normalizeMultiSelectAnswer(correctAnswer);
    }
    if (typeof correctAnswer === 'number') {
      return [correctAnswer];
    }
    return [];
  }

  if (Array.isArray(correctAnswer)) {
    return correctAnswer[0] ?? null;
  }
  return normalizeSingleSelectAnswer(correctAnswer);
};

export const isInductionAnswerCorrect = (userAnswer, correctAnswer, questionType = 'single-select') => {
  const normalizedCorrect = normalizeCorrectAnswer(correctAnswer, questionType);

  if (questionType === 'multi-select') {
    const normalizedUser = normalizeMultiSelectAnswer(userAnswer);
    if (normalizedCorrect.length === 0) {
      return normalizedUser.length > 0;
    }
    if (normalizedUser.length !== normalizedCorrect.length) {
      return false;
    }
    return normalizedUser.every((value, index) => value === normalizedCorrect[index]);
  }

  if (normalizedCorrect === null || normalizedCorrect === undefined) {
    return userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
  }

  return normalizeSingleSelectAnswer(userAnswer) === normalizedCorrect;
};

export const isInductionAnswerProvided = (userAnswer, questionType = 'single-select') => {
  if (questionType === 'multi-select') {
    return Array.isArray(userAnswer) && userAnswer.length > 0;
  }
  return userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
};

export const getInductionQuestions = (induction) => {
  if (!induction) {
    return [];
  }

  return [1, 2, 3]
    .filter((questionNumber) => hasQuestionText(induction, questionNumber))
    .map((questionNumber) => ({
      num: questionNumber,
      text: getQuestionField(induction, questionNumber, 'text'),
      type: getQuestionField(induction, questionNumber, 'type') || 'single-select',
      correct: getQuestionField(induction, questionNumber, 'correct_answer'),
      answerKey: `q${questionNumber}`,
    }));
};

/**
 * @returns {{ valid: boolean, missing: number[], incorrect: number[] }}
 */
export const validateInductionAnswers = (induction, answers = {}) => {
  const questions = getInductionQuestions(induction);
  const missing = [];
  const incorrect = [];

  questions.forEach((question) => {
    const userAnswer = answers[question.answerKey];

    if (!isInductionAnswerProvided(userAnswer, question.type)) {
      missing.push(question.num);
      return;
    }

    if (!isInductionAnswerCorrect(userAnswer, question.correct, question.type)) {
      incorrect.push(question.num);
    }
  });

  return {
    valid: missing.length === 0 && incorrect.length === 0,
    missing,
    incorrect,
  };
};

export const getInductionAnswerValidationMessage = ({ missing = [], incorrect = [] } = {}) => {
  if (missing.length > 0 && incorrect.length > 0) {
    return `Please answer all questions. Questions ${incorrect.join(', ')} are incorrect — review the induction and try again.`;
  }

  if (missing.length > 0) {
    return `Please answer all questions before continuing.`;
  }

  if (incorrect.length === 1) {
    return `Question ${incorrect[0]} is incorrect. Please review the induction content and try again.`;
  }

  if (incorrect.length > 1) {
    return `Questions ${incorrect.join(', ')} are incorrect. Please review the induction content and try again.`;
  }

  return '';
};
