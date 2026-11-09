export const gradeMultipleChoice = (response, options, marks) => {
  const selectedAnswer = typeof response === 'string' ? response.trim().toLowerCase() : '';
  const correctAnswer = options.find(option => option.isCorrect)?.text;
  const isCorrect = Boolean(
    selectedAnswer &&
    typeof correctAnswer === 'string' &&
    selectedAnswer === correctAnswer.trim().toLowerCase()
  );

  return {
    marksAwarded: isCorrect ? marks : 0,
    isCorrect,
  };
};

export const calculateTotalMarks = (answers) => answers.reduce(
  (total, answer) => total + (Number.isFinite(answer.marksAwarded) ? answer.marksAwarded : 0),
  0
);
