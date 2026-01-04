import React from 'react';

const QUESTIONS = [
  "Residuos en recipiente correcto",
  "Residuos fuera de recipientes / piso"
];

const CheckForm = ({ 
  checkNumber, 
  checkData, 
  onAnswerChange, 
  isDisabled = false 
}) => {
  const getAnswer = (questionIndex) => {
    if (!checkData) return null;
    return checkData[`q${questionIndex + 1}`] || null;
  };

  const handleAnswerClick = (questionIndex, answer) => {
    if (isDisabled) return;
    onAnswerChange(questionIndex, answer);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Chequeo {checkNumber}
      </h3>
      
      {QUESTIONS.map((question, index) => {
        const currentAnswer = getAnswer(index);
        
        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="font-medium text-gray-700 mb-3">
              {index + 1}. {question}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleAnswerClick(index, 'Cumple')}
                disabled={isDisabled}
                className={`flex-1 p-3 font-semibold rounded-lg transition ${
                  currentAnswer === 'Cumple'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Cumple
              </button>
              <button
                onClick={() => handleAnswerClick(index, 'No cumple')}
                disabled={isDisabled}
                className={`flex-1 p-3 font-semibold rounded-lg transition ${
                  currentAnswer === 'No cumple'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                No cumple
              </button>
            </div>
            {currentAnswer && (
              <p className={`text-xs mt-2 text-right ${
                currentAnswer === 'Cumple' ? 'text-green-600' : 'text-red-600'
              }`}>
                Estado: {currentAnswer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CheckForm;

