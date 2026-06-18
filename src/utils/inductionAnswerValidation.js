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

export const getCorrectAnswerIndices = (correctAnswer, questionType = 'single-select') => {
  const normalized = normalizeCorrectAnswer(correctAnswer, questionType);

  if (questionType === 'multi-select') {
    return normalized;
  }

  return normalized === null || normalized === undefined ? [] : [normalized];
};

export const isInductionOptionSelected = (optionIndex, selectedAnswers, questionType = 'single-select') => {
  if (questionType === 'multi-select') {
    return Array.isArray(selectedAnswers) && selectedAnswers.includes(optionIndex);
  }

  return selectedAnswers === optionIndex;
};

export const getInductionQuestionContainerStyle = ({
  questionNum,
  validation,
  showFeedback,
  revealedQuestionNums,
  answers,
  induction,
}) => {
  const baseStyle = { marginBottom: 16 };
  const hasError = validation.missing.includes(questionNum) || validation.incorrect.includes(questionNum);

  if (hasError) {
    return {
      ...baseStyle,
      borderWidth: 1,
      borderColor: '#DC2626',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FEF2F2',
    };
  }

  const question = getInductionQuestions(induction).find((item) => item.num === questionNum);
  const wasRevealed = revealedQuestionNums.includes(questionNum);

  if (
    showFeedback &&
    !wasRevealed &&
    question &&
    isInductionAnswerProvided(answers[question.answerKey], question.type)
  ) {
    return {
      ...baseStyle,
      borderWidth: 1,
      borderColor: '#10B981',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#F0FDF4',
    };
  }

  return baseStyle;
};

export const getInductionOptionStyles = ({
  optionIndex,
  selectedAnswers,
  correctAnswer,
  questionType,
  showAnswerFeedback,
  questionRevealed,
}) => {
  const isSingleSelect = questionType === 'single-select';
  const isSelected = isInductionOptionSelected(optionIndex, selectedAnswers, questionType);
  const isCorrectOption = getCorrectAnswerIndices(correctAnswer, questionType).includes(optionIndex);
  const showFeedback = showAnswerFeedback && questionRevealed;
  const baseContainer = {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  };

  if (showFeedback) {
    if (isSelected && !isCorrectOption) {
      return {
        container: {
          ...baseContainer,
          backgroundColor: '#FEF2F2',
          borderWidth: 1,
          borderColor: '#DC2626',
        },
        indicatorBorderColor: '#DC2626',
        indicatorBackgroundColor: '#DC2626',
        showIndicator: true,
        textColor: '#991B1B',
        isSingleSelect,
      };
    }

    if (isCorrectOption) {
      return {
        container: {
          ...baseContainer,
          backgroundColor: '#F0FDF4',
          borderWidth: 1,
          borderColor: '#10B981',
        },
        indicatorBorderColor: '#10B981',
        indicatorBackgroundColor: isSelected ? '#10B981' : 'white',
        showIndicator: isSelected,
        textColor: '#065F46',
        isSingleSelect,
      };
    }
  }

  return {
    container: {
      ...baseContainer,
      backgroundColor: isSelected ? (isSingleSelect ? '#E0E7FF' : '#DCFCE7') : '#F3F4F6',
      borderLeftWidth: 3,
      borderLeftColor: isSelected ? (isSingleSelect ? '#3B82F6' : '#10B981') : '#E5E7EB',
    },
    indicatorBorderColor: isSelected ? (isSingleSelect ? '#3B82F6' : '#10B981') : '#D1D5DB',
    indicatorBackgroundColor: isSelected ? (isSingleSelect ? '#3B82F6' : '#10B981') : 'white',
    showIndicator: isSelected,
    textColor: '#1F2937',
    isSingleSelect,
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
